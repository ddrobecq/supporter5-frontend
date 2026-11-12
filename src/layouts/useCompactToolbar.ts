import { useEffect, useRef, useState, type RefObject } from 'react';

const NAV_BUTTON_SPACING_PX = 8;
const NAV_BUTTON_MIN_WIDTH_PX = 110;
const TOP_ACTIONS_MARGIN_PX = 24;

export interface CompactToolbarResult {
  topToolbarRef: RefObject<HTMLDivElement | null>;
  topBrandRef: RefObject<HTMLDivElement | null>;
  topActionsMeasureRef: RefObject<HTMLDivElement | null>;
  navButtonsRowRef: RefObject<HTMLDivElement | null>;
  compactNavButtons: boolean;
  compactTopActions: boolean;
}

/**
 * Mesure la barre d'outils pour basculer en mode compact (icones seules).
 * `navButtonCount` : nombre de boutons de la rangee de navigation (Outils inclus).
 */
export function useCompactToolbar(navButtonCount: number): CompactToolbarResult {
  const topToolbarRef = useRef<HTMLDivElement | null>(null);
  const topBrandRef = useRef<HTMLDivElement | null>(null);
  const topActionsMeasureRef = useRef<HTMLDivElement | null>(null);
  const navButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const [compactNavButtons, setCompactNavButtons] = useState(false);
  const [compactTopActions, setCompactTopActions] = useState(false);

  useEffect(() => {
    const row = navButtonsRowRef.current;
    if (!row) return;

    const updateCompactState = () => {
      const totalSpacing = NAV_BUTTON_SPACING_PX * Math.max(0, navButtonCount - 1);
      const widthPerButton = (Math.max(0, row.clientWidth) - totalSpacing) / navButtonCount;
      setCompactNavButtons(widthPerButton < NAV_BUTTON_MIN_WIDTH_PX);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(row);

    return () => observer.disconnect();
  }, [navButtonCount]);

  useEffect(() => {
    const toolbar = topToolbarRef.current;
    const brand = topBrandRef.current;
    const actionsMeasure = topActionsMeasureRef.current;
    if (!toolbar || !brand || !actionsMeasure) return;

    const updateCompactState = () => {
      const availableWidth = Math.max(0, toolbar.clientWidth - brand.clientWidth - TOP_ACTIONS_MARGIN_PX);
      const requiredWidth = actionsMeasure.scrollWidth;
      setCompactTopActions(availableWidth < requiredWidth);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(toolbar);
    observer.observe(brand);
    observer.observe(actionsMeasure);

    return () => observer.disconnect();
  }, []);

  return {
    topToolbarRef,
    topBrandRef,
    topActionsMeasureRef,
    navButtonsRowRef,
    compactNavButtons,
    compactTopActions,
  };
}
