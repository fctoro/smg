"use client";

import { Dispatch, SetStateAction, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Badge from "@/components/ui/badge/Badge";
import { ClubEvent, EventCalendarColor, Player, EventType } from "@/types/club";
import { eventTypeLabel, colorFromEventType } from "@/lib/club/status";
import { formatClubDate } from "@/lib/club/metrics";
import {
  calendarColorClass,
  calendarColors,
  calendarColorToType,
  eventTypeToCalendarColor,
} from "@/lib/club/event-calendar";
import { addEventToSupabase, updateEventInSupabase, deleteEventInSupabase } from "@/lib/club/supabase-crud";

interface EventCalendarManagerProps {
  events: ClubEvent[];
  setEvents: Dispatch<SetStateAction<ClubEvent[]>>;
  players: Player[];
}

interface EventFormState {
  id?: string;
  titre: string;
  startDate: string;
  endDate: string;
  lieu: string;
  type: EventType | string;
  customType?: string;
  calendarColor: EventCalendarColor;
}

const defaultFormState: EventFormState = {
  titre: "",
  startDate: "",
  endDate: "",
  lieu: "",
  type: "reunion",
  customType: "",
  calendarColor: "Primary",
};

const inputClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const toInputDate = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function EventCalendarManager({
  events,
  setEvents,
  players,
}: EventCalendarManagerProps) {
  const [formState, setFormState] = useState<EventFormState>(defaultFormState);
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const eventInputs = useMemo<EventInput[]>(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.titre,
        start: event.date,
        extendedProps: {
          type: event.type,
          lieu: event.lieu,
          calendarColor: event.calendarColor ?? eventTypeToCalendarColor(event.type),
        },
      })),
    [events],
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const now = new Date();
    // Midnight to avoid issues with time today
    now.setHours(0, 0, 0, 0);
    return sortedEvents.filter(event => {
      const eventDate = new Date(event.date);
      if (activeTab === "upcoming") {
        return eventDate >= now;
      }
      return eventDate < now;
    });
  }, [sortedEvents, activeTab]);

const resetForm = () => {
    setFormState(defaultFormState);
  };

  const openCreateModal = (dateValue?: string) => {
    setFormState({
      ...defaultFormState,
      startDate: dateValue ?? toInputDate(new Date().toISOString()),
      endDate: dateValue ?? toInputDate(new Date().toISOString()),
      lieu: "Stade FC Toro",
    });
    openModal();
  };

  const openEditModal = (event: ClubEvent) => {
    const isStandardType = ["match", "entrainement", "reunion"].includes(event.type);
    setFormState({
      id: event.id,
      titre: event.titre,
      startDate: toInputDate(event.date),
      endDate: toInputDate(event.date),
      lieu: event.lieu,
      type: isStandardType ? event.type : "autre",
      customType: isStandardType ? "" : event.type,
      calendarColor: event.calendarColor ?? eventTypeToCalendarColor(event.type),
    });
    openModal();
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    openCreateModal(selectInfo.startStr);
  };

  const handleEventClick = (eventClick: EventClickArg) => {
    const targetEvent = events.find((event) => event.id === eventClick.event.id);
    if (targetEvent) {
      openEditModal(targetEvent);
    }
  };

  const handleSaveEvent = async () => {
    if (!formState.titre || !formState.startDate) {
      return;
    }

    const eventDate = `${formState.startDate}T18:00:00`;
    const eventType = formState.type === "autre" ? (formState.customType || "Autre") : formState.type;

    try {
      if (formState.id) {
        const dataToUpdate = {
          titre: formState.titre,
          date: eventDate,
          lieu: formState.lieu || "Stade FC Toro",
          type: eventType,
          calendarColor: formState.calendarColor,
        };
        await updateEventInSupabase(formState.id, dataToUpdate);

        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === formState.id
              ? {
                  ...event,
                  ...dataToUpdate,
                }
              : event,
          ),
        );
      } else {
        const dataToInsert = {
          titre: formState.titre,
          date: eventDate,
          lieu: formState.lieu || "Stade FC Toro",
          type: eventType,
          calendarColor: formState.calendarColor,
          participants: [],
        };
        const insertedData = await addEventToSupabase(dataToInsert);

        setEvents((prevEvents) => [
          ...prevEvents,
          {
            id: insertedData.id,
            ...dataToInsert,
          },
        ]);
      }

      closeModal();
      resetForm();
    } catch (error) {
      alert("Erreur lors de l'enregistrement de l'événement.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEventInSupabase(eventId);
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
    } catch (error) {
      alert("Erreur lors de la suppression de l'événement.");
    }
  };

  const closeAndReset = () => {
    closeModal();
    resetForm();
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const color = eventInfo.event.extendedProps
      .calendarColor as EventCalendarColor;
    const colorClass = calendarColorClass(color);

    return (
      <div
        className={`event-fc-color flex fc-event-main items-center ${colorClass}`}
      >
        <div className="fc-daygrid-event-dot"></div>
        <div className="fc-event-time">{eventInfo.timeText}</div>
        <div className="fc-event-title">{eventInfo.event.title}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Calendrier des evenements
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Planifiez les matchs, entrainements et reunions
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Ajouter un evenement
          </button>
        </div>
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,listWeek",
            }}
            events={eventInputs}
            selectable
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
        {/* TABS UI */}
        <div className="flex justify-start pb-4 mb-2 mt-2 overflow-x-auto hide-scrollbar">
          <div className="inline-flex items-center gap-1 rounded-full bg-gray-100/80 p-1.5 dark:bg-gray-800/80 backdrop-blur-sm shadow-inner">
            {[
              { id: "upcoming", label: "Évènements prévus" },
              { id: "history", label: "Historique" }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const count = sortedEvents.filter(event => {
                const eventDate = new Date(event.date);
                return tab.id === "upcoming" ? eventDate >= now : eventDate < now;
              }).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "upcoming" | "history")}
                  className={`relative flex items-center gap-2.5 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ease-out ${
                    isActive
                      ? "bg-white text-[#C8102E] shadow-sm ring-1 ring-black/5 dark:bg-gray-900 dark:text-red-500 dark:ring-white/10"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700/50"
                  }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  <span className="relative z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C8102E] px-1.5 text-[10.5px] font-black text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Aucun évènement à afficher dans cette catégorie pour le moment.
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-gray-800 dark:text-white/90">
                    {event.titre}
                  </h4>
                  <Badge size="sm" color={colorFromEventType(event.type as EventType)}>
                    {eventTypeLabel[event.type as EventType] || event.type}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatClubDate(event.date)} - {event.lieu}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  onClick={() => openEditModal(event)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-white/[0.03]"
                  onClick={() => handleDeleteEvent(event.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeAndReset}
        className="max-w-[900px] p-6 lg:p-10"
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {formState.id ? "Edit Event" : "Add Event"}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Plan your next big moment: schedule or edit an event to stay on track
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Title
              </label>
              <input
                value={formState.titre}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, titre: event.target.value }))
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Type d'évènement
              </label>
              <div className="flex flex-wrap items-center gap-5">
                {[
                  { id: "match", label: "Match", color: "Danger" },
                  { id: "entrainement", label: "Entraînement", color: "Success" },
                  { id: "reunion", label: "Réunion", color: "Primary" },
                  { id: "autre", label: "Autres", color: "Warning" }
                ].map((option) => (
                  <label
                    key={option.id}
                    className="inline-flex items-center gap-2 text-lg text-gray-800 dark:text-white/90 cursor-pointer"
                  >
                    <span className="relative">
                      <input
                        type="radio"
                        className="sr-only"
                        name="event-type"
                        checked={formState.type === option.id}
                        onChange={() =>
                          setFormState((prev) => ({
                            ...prev,
                            type: option.id as EventType,
                            calendarColor: option.color as EventCalendarColor,
                          }))
                        }
                      />
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            option.color === "Danger" ? "bg-error-500" : option.color === "Success" ? "bg-success-500" : option.color === "Warning" ? "bg-warning-500" : "bg-brand-500"
                          } ${
                            formState.type === option.id
                              ? "block"
                              : "hidden"
                          }`}
                        ></span>
                      </span>
                    </span>
                    {option.label}
                  </label>
                ))}
              </div>
              {formState.type === "autre" && (
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Précisez le type d'évènement"
                    value={formState.customType}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, customType: e.target.value }))
                    }
                    className={inputClassName}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter Start Date
              </label>
              <input
                type="date"
                value={formState.startDate}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter End Date
              </label>
              <input
                type="date"
                value={formState.endDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Location
              </label>
              <input
                value={formState.lieu}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, lieu: event.target.value }))
                }
                className={inputClassName}
                placeholder="Stade FC Toro"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              onClick={closeAndReset}
            >
              Close
            </button>
            <button
              type="button"
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
              onClick={handleSaveEvent}
            >
              {formState.id ? "Update Event" : "Add Event"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
