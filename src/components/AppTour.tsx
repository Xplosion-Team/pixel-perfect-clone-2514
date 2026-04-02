import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useLocation } from "react-router-dom";

const TOUR_KEY = "farerx-tour-completed";

const budgetSteps: Step[] = [
  {
    target: "[data-tour='brand']",
    content: "Welcome to FareRX — your complete financial planning tool for launching a physician-owned practice. Let's take a quick tour!",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='kpi-cards']",
    content: "These KPI cards give you a snapshot of your startup costs, monthly burn, and capital needs at a glance.",
    placement: "bottom",
  },
  {
    target: "[data-tour='budget-sections']",
    content: "Each budget category breaks down line-item costs with low and high estimates so you can plan for best and worst case scenarios.",
    placement: "top",
  },
  {
    target: "[data-tour='budget-chart']",
    content: "This chart visualizes your cost breakdown across all categories — hover for details.",
    placement: "top",
  },
  {
    target: "[data-tour='nav-cashflow']",
    content: "Next, check the Cash Flow Model to see your month-by-month bank balance with adjustable assumptions.",
    placement: "right",
  },
];

const cashflowSteps: Step[] = [
  {
    target: "[data-tour='cf-kpis']",
    content: "These cards show your lowest projected balance, when you become cash-positive, total expenses, and total revenue.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='cf-sliders']",
    content: "Adjust these sliders to model different scenarios — patient counts, growth rate, EHR costs, and starting capital.",
    placement: "bottom",
  },
  {
    target: "[data-tour='cf-timeline']",
    content: "This timeline shows when revenue streams kick in — MNT cash arrives Month 2, CCM/RPM cash arrives Month 4 after the 90-day delay.",
    placement: "bottom",
  },
  {
    target: "[data-tour='cf-table']",
    content: "The full month-by-month breakdown shows billing, cash received, expenses, and your running bank balance.",
    placement: "top",
  },
  {
    target: "[data-tour='cf-export']",
    content: "Export the entire model to Excel with formulas intact for offline analysis or sharing with investors.",
    placement: "bottom",
  },
];

const formationSteps: Step[] = [
  {
    target: "[data-tour='formation-compare']",
    content: "Compare PC vs PLLC formation structures side by side — costs, compliance requirements, and long-term implications.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: "[data-tour='formation-timeline']",
    content: "This timeline maps out every step from engaging an attorney through first patient billing, with estimated durations and costs.",
    placement: "top",
  },
];

const joyrideStyles = {
  options: {
    arrowColor: "hsl(40, 14%, 97%)",
    backgroundColor: "hsl(40, 14%, 97%)",
    textColor: "hsl(48, 6%, 10%)",
    primaryColor: "hsl(48, 96%, 53%)",
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: 10,
    fontSize: 13,
    padding: "16px 20px",
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: 700,
  },
  buttonNext: {
    backgroundColor: "hsl(48, 96%, 53%)",
    color: "hsl(0, 0%, 7%)",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 16px",
  },
  buttonBack: {
    color: "hsl(48, 4%, 36%)",
    fontSize: 12,
    fontWeight: 500,
  },
  buttonSkip: {
    color: "hsl(48, 4%, 56%)",
    fontSize: 11,
  },
  buttonClose: {
    color: "hsl(48, 4%, 56%)",
  },
  spotlight: {
    borderRadius: 8,
  },
};

export function AppTour() {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourKey, setTourKey] = useState("");

  useEffect(() => {
    const path = location.pathname;
    let key = "";
    let s: Step[] = [];

    if (path === "/") {
      key = `${TOUR_KEY}-budget`;
      s = budgetSteps;
    } else if (path === "/cash-flow") {
      key = `${TOUR_KEY}-cashflow`;
      s = cashflowSteps;
    } else if (path === "/formation") {
      key = `${TOUR_KEY}-formation`;
      s = formationSteps;
    }

    if (key && !localStorage.getItem(key)) {
      setSteps(s);
      setTourKey(key);
      // Small delay to let page render
      setTimeout(() => setRun(true), 600);
    } else {
      setRun(false);
    }
  }, [location.pathname]);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status } = data;
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        if (tourKey) localStorage.setItem(tourKey, "true");
      }
    },
    [tourKey]
  );

  if (!steps.length) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      callback={handleCallback}
      styles={joyrideStyles}
      locale={{
        back: "Back",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}

export function resetTours() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(TOUR_KEY))
    .forEach((k) => localStorage.removeItem(k));
}
