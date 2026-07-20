import { useEffect, useMemo, useState } from 'react';

const WELCOME_DURATION_MS = 4500;

function getRemainingTime(targetTime) {
  const total = Math.max(0, targetTime - Date.now());
  const seconds = Math.floor(total / 1000);

  return {
    total,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function Fireworks() {
  return (
    <div className="launch-fireworks" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} className={`launch-firework launch-firework-${index + 1}`} />
      ))}
    </div>
  );
}

function CountdownScreen({ remaining }) {
  const units = [
    { label: 'Days', value: remaining.days },
    { label: 'Hours', value: remaining.hours },
    { label: 'Minutes', value: remaining.minutes },
    { label: 'Seconds', value: remaining.seconds },
  ];

  return (
    <div className="launch-screen launch-countdown-screen">
      <div className="launch-logo-card">
        <img src="/gobook-logo-full.png" alt="GoBook" />
      </div>

      <p className="launch-eyebrow">Production launch</p>
      <h1>GoBook goes live soon</h1>
      <p className="launch-copy">We are getting your billing workspace ready.</p>

      <div className="launch-countdown-grid" aria-label="Launch countdown">
        {units.map(({ label, value }) => (
          <div key={label} className="launch-countdown-unit">
            <strong>{pad(value)}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="launch-screen launch-welcome-screen">
      <Fireworks />
      <div className="launch-logo-card launch-logo-card-large">
        <img src="/gobook-logo-full.png" alt="GoBook" />
      </div>
      <p className="launch-eyebrow">Welcome</p>
      <h1>GoBook is live</h1>
      <p className="launch-copy">Your smart billing experience is ready.</p>
    </div>
  );
}

export function LaunchExperience({ children }) {
  const launchAt = import.meta.env.VITE_LAUNCH_AT;
  const targetTime = useMemo(() => Date.parse(launchAt || ''), [launchAt]);
  const [remaining, setRemaining] = useState(() => getRemainingTime(targetTime));
  const [showWelcome, setShowWelcome] = useState(false);
  const [finished, setFinished] = useState(() => !Number.isFinite(targetTime) || Date.now() >= targetTime);

  useEffect(() => {
    if (!Number.isFinite(targetTime) || showWelcome || finished) return undefined;

    const tick = () => {
      const nextRemaining = getRemainingTime(targetTime);
      setRemaining(nextRemaining);

      if (nextRemaining.total <= 0) {
        setShowWelcome(true);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [finished, showWelcome, targetTime]);

  useEffect(() => {
    if (!showWelcome) return undefined;

    const timer = window.setTimeout(() => setFinished(true), WELCOME_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [showWelcome]);

  if (finished) return children;
  if (showWelcome) return <WelcomeScreen />;

  return <CountdownScreen remaining={remaining} />;
}
