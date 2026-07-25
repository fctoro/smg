"use client";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useUserRole } from "../context/UserRoleContext";
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
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
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
    subItems: [
      { name: "Liste", path: "/joueurs" },
      { name: "Ajouter", path: "/joueurs/nouveau" },
    ],
  },
  {
    icon: <GroupIcon />,
    name: "Parents",
    subItems: [
      { name: "Liste", path: "/parents" },
      { name: "Ajouter", path: "/parents/nouveau" },
    ],
  },
  {
    name: "Alumni",
    icon: <DocsIcon />,
    subItems: [
      { name: "Liste", path: "/alumni" },
      { name: "Ajouter", path: "/alumni/nouveau" },
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Employés",
    subItems: [
      { name: "Liste", path: "/employes" },
      { name: "Ajouter", path: "/employes/nouveau" },
      { name: "Payroll", path: "/payroll" },
    ],
  },
  {
    icon: <CalenderIcon />,
    name: "Evenements",
    subItems: [
      { name: "Calendrier", path: "/evenements" },
      { name: "Ajouter", path: "/evenements/nouveau" },
    ],
  },
  {
    icon: <DollarLineIcon />,
    name: "Paiements",
    subItems: [
      { name: "Liste", path: "/paiements" },
      { name: "Ajouter", path: "/paiements/nouveau" },
      { name: "Reçus PDF", path: "/recus", new: true },
      { name: "Payroll", path: "/payroll" },
    ],
  },
  {
    icon: <DocsIcon />,
    name: "Factures",
    path: "/factures",
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
    icon: <TableIcon />,
    name: "Classement",
    path: "/coach?tab=classement",
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
    name: "Calendrier Matchs",
    path: "/coach?tab=calendrier",
  },
];

const baseOthersItems: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Parametres",
    subItems: [
      { name: "Club", path: "/parametres", pro: false },
      { name: "Dashboard", path: "/parametres/dashboard", pro: false },
      { name: "Gestion des accès", path: "/parametres/acces", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { role, isCoach, isAdmin, isSuperAdmin, userSections } = useUserRole();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const inCoachArea = pathname.startsWith("/coach");

  // Filter main menu items dynamically
  const filteredMainItems = useMemo(() => {
    if (isSuperAdmin) {
      return adminNavItems;
    }
    if (isCoach) {
      // Coach: always show coach items first, then any extra admin sections granted by super admin
      const grantedAdminSections = adminNavItems.filter((item) => userSections.includes(item.name));
      return [...coachNavItems, ...grantedAdminSections];
    }
    return adminNavItems.filter((item) => userSections.includes(item.name));
  }, [isCoach, isSuperAdmin, userSections]);

  // Filter Parametres items
  const filteredOthersItems = useMemo(() => {
    if (isSuperAdmin) {
      return baseOthersItems;
    }
    if (!userSections.includes("Paramètres")) {
      return [];
    }
    return baseOthersItems.map((item) => {
      if (item.name === "Parametres" && item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((sub) => sub.path !== "/parametres/acces"),
        };
      }
      return item;
    });
  }, [isSuperAdmin, userSections]);

  // Use coachNavItems as the SSR default when on /coach to avoid flash
  const displayMainItems = inCoachArea
    ? (mounted ? filteredMainItems : coachNavItems)
    : (mounted ? filteredMainItems : adminNavItems);
  const displayOthersItems = (mounted ? filteredOthersItems : (inCoachArea ? [] : baseOthersItems));

  const isSubItemActive = useCallback(
    (path: string) => {
      if (pathname === path) {
        return true;
      }
      if (path.endsWith("/nouveau")) {
        return false;
      }
      return (
        pathname.startsWith(`${path}/`) &&
        !pathname.startsWith(`${path}/nouveau`)
      );
    },
    [pathname],
  );

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") {
        return pathname === "/";
      }
      if (path.includes("?tab=")) {
        const [basePath, search] = path.split("?");
        if (typeof window !== "undefined") {
          const currentSearch = window.location.search;
          return pathname === basePath && currentSearch.includes(search);
        }
      }
      return pathname === path || (path !== "/dashboard" && pathname.startsWith(`${path}/`));
    },
    [pathname],
  );

  const renderMenuItems = (
    items: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
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
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isSubItemActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? displayMainItems : displayOthersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, displayMainItems, displayOthersItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const subtitleLabel = !mounted
    ? "Club Dashboard"
    : inCoachArea
    ? "Espace Coach"
    : isCoach
    ? "Compte Coach"
    : isAdmin
    ? "Compte Admin"
    : "Club Dashboard";

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 print:hidden
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
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

      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar">
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
    </aside>
  );
};

export default AppSidebar;
