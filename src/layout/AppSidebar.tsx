"use client";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useUserRole } from "../context/UserRoleContext";
import { useClubData } from "../context/ClubDataContext";
import { supabase } from "@/lib/supabaseClient";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  DocsIcon,
  DollarLineIcon,
  GroupIcon,
  GridIcon,
  HorizontaLDots,
  PieChartIcon,
  PlugInIcon,
  TaskIcon,
  TableIcon,
  UserCircleIcon,
  LockIcon,
  PaperPlaneIcon,
  CoachIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  sections?: string[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Standard Admin items
const adminNavItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: <PieChartIcon />,
    name: "Statistiques",
    path: "/statistiques",
  },
  {
    icon: <UserCircleIcon />,
    name: "Joueurs",
    path: "/joueurs",
  },
  {
    icon: <DollarLineIcon />,
    name: "Paiements",
    path: "/paiements",
  },
  {
    icon: <GroupIcon />,
    name: "Parents",
    path: "/parents",
  },
  {
    icon: <CoachIcon />,
    name: "Coachs",
    path: "/coachs",
  },
  {
    icon: <BoxCubeIcon />,
    name: "Employés",
    path: "/employes",
  },
  {
    icon: <DollarLineIcon />,
    name: "Payroll",
    path: "/payroll",
    sections: ["Employés", "Paiements"],
  },
  {
    icon: <DocsIcon />,
    name: "Demandes",
    path: "/demandes/inscriptions",
    new: true,
  },
  {
    icon: <DocsIcon />,
    name: "RP Joueurs",
    path: "/recus",
    new: true,
    sections: ["Paiements"],
  },
  {
    icon: <TaskIcon />,
    name: "Statuts Spéciaux",
    path: "/joueurs/statuts-speciaux",
  },
  {
    name: "Alumni",
    icon: <DocsIcon />,
    path: "/alumni",
  },
  {
    icon: <CalenderIcon />,
    name: "Evenements",
    path: "/evenements",
  },
  {
    icon: <TaskIcon />,
    name: "Programmes",
    path: "/programmes",
    new: true,
  },
  {
    icon: <TaskIcon />,
    name: "Rubriques",
    path: "/rubriques",
    sections: ["Paiements", "Finance", "Paramètres"],
  },
];

// Dedicated Coach Portal items
const coachNavItems: NavItem[] = [
  {
    icon: <TaskIcon />,
    name: "Espace Coach",
    path: "/coach",
  },
  {
    icon: <UserCircleIcon />,
    name: "Tactiques & Terrain",
    path: "/coach?tab=tactiques",
  },
  {
    icon: <GroupIcon />,
    name: "Effectif Joueurs",
    path: "/coach?tab=effectif",
  },
  {
    icon: <CalenderIcon />,
    name: "Faire l'appel",
    path: "/coach?tab=presences",
  },
];

const baseOthersItems: NavItem[] = [
  {
    icon: <LockIcon />,
    name: "Gestion des accès",
    path: "/parametres/acces",
    sections: ["Paramètres"],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { role, isCoach, isAdmin, isSuperAdmin, userSections } = useUserRole();
  const { events } = useClubData();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTab = searchParams.get("tab");
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const upcomingEventsCount = useMemo(() => {
    if (!events) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return events.filter(event => new Date(event.date) >= now).length;
  }, [events]);

  useEffect(() => {
    setMounted(true);

    const handleUpdate = (e: any) => {
      setUnreadCount(e.detail);
    };

    window.addEventListener('update-unread-count', handleUpdate);

    return () => {
      window.removeEventListener('update-unread-count', handleUpdate);
    };
  }, [pathname]);

  const inCoachArea = pathname.startsWith("/coach");

  // Filter main menu items dynamically
  const filteredMainItems = useMemo(() => {
    if (isSuperAdmin) {
      return adminNavItems;
    }
    const checkAccess = (item: NavItem) => {
      if (item.sections) {
        return item.sections.some((sec) => userSections.includes(sec));
      }
      return userSections.includes(item.name);
    };
    if (isCoach) {
      // Coach: always show coach items first, then any extra admin sections granted by super admin
      const grantedAdminSections = adminNavItems
        .filter(checkAccess)
        .filter((adminItem) => !coachNavItems.some((coachItem) => coachItem.name === adminItem.name));
      return [...coachNavItems, ...grantedAdminSections];
    }
    return adminNavItems.filter(checkAccess);
  }, [isCoach, isSuperAdmin, userSections]);

  // Filter Parametres items
  const filteredOthersItems = useMemo(() => {
    if (isSuperAdmin) {
      return baseOthersItems;
    }
    if (!userSections.includes("Paramètres")) {
      return [];
    }
    return baseOthersItems.filter((item) => item.path !== "/parametres/acces");
  }, [isSuperAdmin, userSections]);

  const displayMainItems = mounted ? filteredMainItems : adminNavItems;
  const displayOthersItems = mounted ? filteredOthersItems : baseOthersItems;

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") {
        return pathname === "/";
      }
      
      if (path === "/coach") {
        return pathname === "/coach" && !searchTab;
      }

      if (path.includes("?tab=")) {
        const [basePath, search] = path.split("?");
        const searchParamsFromPath = new URLSearchParams(search);
        const tabToMatch = searchParamsFromPath.get("tab");
        return pathname === basePath && searchTab === tabToMatch;
      }
      return pathname === path || (path !== "/dashboard" && pathname.startsWith(`${path}/`));
    },
    [pathname, searchTab],
  );

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav) => (
        <li key={nav.name}>
          {nav.path && (
            <Link
              href={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="flex items-center justify-between w-full pr-4">
                  <span className={`menu-item-text`}>{nav.name}</span>
                  {nav.name === "Demandes" && unreadCount > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-medium text-error-500">
                      {unreadCount}
                    </span>
                  ) : nav.name === "Evenements" && upcomingEventsCount > 0 ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-medium text-error-500">
                      {upcomingEventsCount}
                    </span>
                  ) : nav.new && nav.name !== "Demandes" ? (
                    <span className="inline-flex items-center justify-center rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-medium text-error-500">
                      NEW
                    </span>
                  ) : null}
                </div>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  const subtitleLabel = !mounted
    ? "Club Dashboard"
    : inCoachArea
    ? "Espace Coach"
    : isCoach
    ? "Compte Coach"
    : isSuperAdmin
    ? "Compte Super Admin"
    : isAdmin
    ? "Compte Admin"
    : "Club Dashboard";

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 print:hidden
        ${
          isExpanded || isMobileOpen
            ? "w-[240px]"
            : isHovered
            ? "w-[240px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-6 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={inCoachArea ? "/coach" : "/dashboard"}>
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo/fc-toro.png"
                alt="FC Toro"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div>
                <p className="text-lg font-semibold leading-5 text-gray-900 dark:text-white">
                  FC Toro
                </p>
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400" suppressHydrationWarning>
                  {subtitleLabel}
                </p>
              </div>
            </div>
          ) : (
            <Image
              src="/images/logo/fc-toro.png"
              alt="FC Toro"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear sidebar-scrollbar -mr-4 pr-4">
        <nav className="mb-6">
          <div className="flex flex-col gap-4" suppressHydrationWarning>
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  inCoachArea ? "Menu Coach" : "Menu Principal"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(displayMainItems, "main")}
            </div>

            {displayOthersItems.length > 0 && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Config"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(displayOthersItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>

      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="py-3 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            © 2026 FC TORO
          </p>
          <p className="flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <span>Conçu par</span>
            <a
              href="https://www.octacore.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src="/images/logo/octacore-logo.png"
                alt="OCTACORE"
                width={80}
                height={16}
                className="h-3.5 w-auto object-contain"
                unoptimized
              />
            </a>
          </p>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
