'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Phase = 'intro' | 'playing' | 'ended';
type StatKey = 'sinn' | 'gesundheit' | 'familie' | 'energie' | 'geld' | 'hund' | 'hitze' | 'haushalt';
type Stats = Record<StatKey, number>;

type Choice = {
  label: string;
  hint: string;
  effects: Partial<Stats>;
  log: string;
  revenue?: number;
  controllerBroken?: boolean;
};

type GameEvent = {
  id: string;
  icon: string;
  kicker: string;
  title: string;
  text: string;
  choices: Choice[];
};

type Action = {
  id: string;
  key: string;
  icon: string;
  label: string;
  description: string;
  position: string;
  cooldown: number;
  effects: Partial<Stats>;
  log: string;
};

const SHIFT_SECONDS = 180;

const INITIAL_STATS: Stats = {
  sinn: 54,
  gesundheit: 74,
  familie: 58,
  energie: 68,
  geld: 6500,
  hund: 5,
  hitze: 18,
  haushalt: 52,
};

const ACTIONS: Action[] = [
  {
    id: 'arbeit', key: '1', icon: '💻', label: 'Arbeiten', position: 'pos-work', cooldown: 8,
    description: '+950 € · −Energie · −Sinn', effects: { geld: 950, energie: -10, sinn: -4, gesundheit: -2 },
    log: 'Eine Präsentation mit 46 Folien gebaut. Niemand hat die letzte gelesen.',
  },
  {
    id: 'familie', key: '2', icon: '🤝', label: 'Vermitteln', position: 'pos-family', cooldown: 7,
    description: '+Familie · −Energie', effects: { familie: 13, energie: -8, sinn: 4, haushalt: 3 },
    log: 'Paul bekommt Rückzug, Theo Bewegung und Friedrich den blauen Becher. Waffenstillstand.',
  },
  {
    id: 'haushalt', key: '3', icon: '🧺', label: 'Haushalt', position: 'pos-chores', cooldown: 7,
    description: '+Ordnung · +Beziehung', effects: { haushalt: 16, familie: 8, energie: -10, sinn: 2 },
    log: 'Wäsche gefaltet. Drei Socken bleiben institutionell ungeklärt.',
  },
  {
    id: 'konsole', key: '4', icon: '🎮', label: 'PlayStation', position: 'pos-console', cooldown: 9,
    description: '+Sinn · −Haushalt', effects: { sinn: 14, energie: 6, familie: -3, haushalt: -7, geld: -45 },
    log: 'Online-Runde mit Markus. Kurz war die Welt in Ordnung.',
  },
  {
    id: 'hund', key: '5', icon: '🐕', label: 'Gassi', position: 'pos-dog', cooldown: 8,
    description: '+Feini · +Gesundheit', effects: { hund: 15, gesundheit: 6, energie: -7, hitze: -7, haushalt: 5, sinn: 4 },
    log: 'Fenja hat draußen gemacht. Amtlich: ein ziemliches Feini.',
  },
  {
    id: 'kinder', key: '6', icon: '🪙', label: 'Kinderjob', position: 'pos-kids', cooldown: 11,
    description: '+50 € Beitrag · Risiko', effects: { geld: 50, familie: -2, haushalt: 5, sinn: 2 },
    log: 'Pfandflaschen-Startup gegründet. Noch kein Unicorn, aber 50 Euro Umsatz.',
  },
  {
    id: 'grill', key: '7', icon: '🔥', label: 'Grillen', position: 'pos-grill', cooldown: 12,
    description: '+Sinn · +Familie · +Hitze', effects: { sinn: 15, familie: 9, hitze: 18, geld: -180, energie: -4 },
    log: 'Wurst vom Creutz-Fleischer. Die Sinnfrage ist für sechs Minuten vertagt.',
  },
  {
    id: 'gym', key: '8', icon: '🏋️', label: 'Fitness', position: 'pos-gym', cooldown: 11,
    description: '+Gesundheit · ++Hitze', effects: { gesundheit: 10, sinn: 5, energie: -14, hitze: 20, familie: -2 },
    log: 'Sport gemacht. Vernünftig dosiert wäre er vermutlich noch gesünder.',
  },
  {
    id: 'bier', key: '9', icon: '🍺', label: 'Bier', position: 'pos-beer', cooldown: 6,
    description: '+Sinn · −Gesundheit', effects: { sinn: 8, energie: 4, gesundheit: -6, hitze: 4, geld: -25 },
    log: 'Ein Bier geöffnet. Wissenschaftlich weiterhin keine Lösung, aber kalt.',
  },
];

const EVENTS: GameEvent[] = [
  {
    id: 'controller', icon: '🦷', kicker: 'FENJA-ALARM', title: 'Knuspriger Controller',
    text: 'Fenja hat den PlayStation-Controller entdeckt. Ihr Feini-Index und dein Abend entwickeln sich in verschiedene Richtungen.',
    choices: [
      { label: 'Controller retten & sofort Gassi', hint: '+Feini · −Energie', effects: { hund: 8, energie: -8, gesundheit: 3 }, log: 'Controller gerettet. Fenja kaut nun demonstrativ auf einem erlaubten Seil.' },
      { label: 'Sie soll ihren Spaß haben', hint: '+Hund · −420 € · Controller kaputt', effects: { hund: 14, geld: -420, sinn: -6 }, log: 'Fenja ist glücklich. Der Controller hat jetzt kabellose Ecken.', controllerBroken: true },
    ],
  },
  {
    id: 'brothers', icon: '💢', kicker: 'BRUDERFRIEDEN', title: '„Der soll aus meinen Augen!“',
    text: 'Paul braucht sofort Ruhe. Theo rennt im Flur Runden und Friedrich möchte wissen, ob jetzt Krieg ist.',
    choices: [
      { label: 'Rückzugsraum & Bewegungsauftrag', hint: '+Familie · −Energie', effects: { familie: 14, energie: -9, haushalt: 3, sinn: 5 }, log: 'Bedürfnisse sortiert statt Kinder. Das wirkt erstaunlich gut.' },
      { label: 'Alle müssen jetzt zusammen spielen', hint: 'Schnell · aber riskant', effects: { familie: -16, energie: -4, haushalt: -8, sinn: -7 }, log: 'Zwangsharmonie beantragt. Antrag mit Bauklötzen abgelehnt.' },
    ],
  },
  {
    id: 'parkour', icon: '🏃', kicker: 'THEO IN BEWEGUNG', title: 'Sofa-Parkour auf Schmerzfreiheit',
    text: 'Theo testet, ob Schwerkraft nur eine Empfehlung ist. Der Couchtisch hat Bedenken.',
    choices: [
      { label: 'Kissenparcours im Flur bauen', hint: '+Familie · −Haushalt', effects: { familie: 10, gesundheit: 3, haushalt: -7, energie: -5, sinn: 4 }, log: 'Aus Chaos wurde Sportpädagogik. Der Flur bleibt unbewertbar.' },
      { label: 'Laut „NICHT SPRINGEN!“', hint: 'Spart Energie · kostet Nerven', effects: { familie: -10, sinn: -5, haushalt: -3 }, log: 'Er springt jetzt leiser. Das war nicht die Aufgabe.' },
    ],
  },
  {
    id: 'uncle', icon: '🌭', kicker: 'MARKUS IST ONLINE', title: 'Der Onkel hat Wurst',
    text: 'Markus steht mit Creutz-Wurst vor der Tür und wäre später für eine Online-Runde zu haben.',
    choices: [
      { label: 'Reinlassen & Grill an', hint: '+Sinn · +Familie · +Hitze', effects: { sinn: 16, familie: 12, hitze: 15, geld: -80 }, log: 'Markus grillt. Friedrich erhält ein Geschenk mit völlig unnötigen Batterien.' },
      { label: 'Heute nur online spielen', hint: '+Sinn · −Beziehung', effects: { sinn: 12, familie: -5, energie: 5, haushalt: -4 }, log: 'Digitaler Familienfreund. Die Wurst muss leider warten.' },
    ],
  },
  {
    id: 'professor', icon: '🎓', kicker: 'ZWILLINGSBRUDER RUFT AN', title: '„Bei uns am Lehrstuhl …“',
    text: 'Dein Zwillingsbruder erwähnt beiläufig zum siebten Mal, dass er Professor ist. Du bist weiterhin „nur“ Dr.',
    choices: [
      { label: 'Souverän gratulieren', hint: '+Gesundheit · +Familie', effects: { gesundheit: 5, familie: 4, sinn: 2, energie: -2 }, log: 'Neid heruntergeschluckt. Schmeckt ähnlich wie alkoholfreies Bier.' },
      { label: 'Habilitation sofort anfangen', hint: '+1.250 € · −Sinn · −Energie', effects: { geld: 1250, sinn: -11, energie: -14, familie: -5 }, log: 'Abstract geschrieben. Titel: „Zur Ontologie der Grillzange“.' },
    ],
  },
  {
    id: 'gift', icon: '🎁', kicker: 'PATENONKEL-ÖKONOMIE', title: 'Ein Geschenk für Friedrich',
    text: 'Der Patenonkel war nicht da, aber ein riesiges Spielzeugpaket schon. Es macht Geräusche und passt nirgendwo hin.',
    choices: [
      { label: 'Gemeinsam auspacken', hint: '+Familie · −Haushalt', effects: { familie: 12, sinn: 6, haushalt: -10 }, log: 'Friedrich strahlt. Der Karton wird zur Burg. Das Geschenk liegt daneben.' },
      { label: 'Als Familienumsatz verbuchen', hint: '+240 € · −Familie', effects: { geld: 240, familie: -7, sinn: -4 }, revenue: 240, log: 'Buchhalterisch profitabel. Emotional eher Quartalswarnung.' },
    ],
  },
  {
    id: 'health', icon: '🌡️', kicker: 'LEBE-ICH-NOCH-INDEX', title: 'Zu warm. Zu viel. Zu flackerig.',
    text: 'Der Vater wird heiß und die Deko-Lichter sind unnötig hektisch. Das Spiel selbst flackert selbstverständlich nicht.',
    choices: [
      { label: 'Licht aus, Fenster auf, Pause', hint: '−Hitze · +Gesundheit', effects: { hitze: -28, gesundheit: 12, energie: 9, sinn: 2 }, log: 'Reize runter, Wasser rein. Weiterleben bleibt überraschend vernünftig.' },
      { label: 'Nur noch ein Satz im Gym', hint: '++Hitze · Gesundheitsrisiko', effects: { hitze: 24, gesundheit: -18, energie: -10, sinn: -3 }, log: 'Der Ehrgeiz gewinnt. Der Körper reicht Dienstaufsichtsbeschwerde ein.' },
    ],
  },
  {
    id: 'wife', icon: '📋', kicker: 'FAMILIEN-BILANZ', title: '1.000 Euro die Minute?',
    text: 'Deine Frau hält Haushalt, Termine und alle unsichtbaren Fäden zusammen. Der satirische Kostenzähler läuft trotzdem.',
    choices: [
      { label: 'Dank sagen & Haushalt übernehmen', hint: '+Beziehung · +Ordnung · −Energie', effects: { familie: 16, haushalt: 14, energie: -12, sinn: 8 }, log: 'Unbezahlte Arbeit erkannt. Die Familienbilanz wird sofort weniger dämlich.' },
      { label: 'Nach einer Excel-Aufstellung fragen', hint: 'Sehr schlechte Idee', effects: { familie: -22, sinn: -9, haushalt: -8, energie: -4 }, log: 'Excel geöffnet. Beziehung geschlossen.' },
    ],
  },
  {
    id: 'floor', icon: '💩', kicker: 'GESCHÄFTLICHES', title: 'Fenja hat in den Flur gekackt',
    text: 'Der Feini-Index beantragt eine Neubewertung. Gleichzeitig nähert sich Theo mit erstaunlichem Tempo.',
    choices: [
      { label: 'Sichern, putzen, später länger raus', hint: '+Haushalt · +Feini · −Energie', effects: { haushalt: 11, hund: 5, energie: -9, sinn: -2 }, log: 'Katastrophe beseitigt. Niemand ist hineingetreten. Ein historischer Erfolg.' },
      { label: 'So tun, als wäre es nicht da', hint: '−Feini · −Haushalt · Mutig', effects: { hund: -18, haushalt: -17, familie: -8, sinn: -7 }, log: 'Es war weiterhin da. Jetzt nur mit größerem Radius.' },
    ],
  },
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function patchStats(stats: Stats, effects: Partial<Stats>): Stats {
  const next = { ...stats };
  (Object.keys(effects) as StatKey[]).forEach((key) => {
    const value = next[key] + (effects[key] ?? 0);
    if (key === 'geld') next[key] = value;
    else if (key === 'hund') next[key] = clamp(value, -100, 100);
    else next[key] = clamp(value);
  });
  return next;
}

function getMeaning(stats: Stats) {
  const moneyScore = clamp((stats.geld + 2000) / 100, 0, 100);
  const heatPenalty = Math.max(0, stats.hitze - 60) * 0.55;
  return clamp(Math.round(
    stats.sinn * .31 + stats.gesundheit * .17 + stats.familie * .23 +
    stats.energie * .08 + ((stats.hund + 100) / 2) * .09 + stats.haushalt * .07 + moneyScore * .05 - heatPenalty
  ));
}

function getDogRank(value: number) {
  if (value >= 35) return 'FEINI';
  if (value <= -25) return 'BÖSI';
  return 'OKAYI';
}

function getLifeRank(stats: Stats) {
  if (stats.gesundheit <= 24 || stats.hitze >= 88) return 'KRANKENHAUS?';
  if (stats.gesundheit <= 48 || stats.hitze >= 70) return 'BEOBACHTEN';
  return 'AM LEBEN';
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('de-DE')} €`;
}

function formatTime(value: number) {
  const remaining = Math.max(0, SHIFT_SECONDS - value);
  return `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
}

function endingFor(index: number, stats: Stats, reason: string) {
  if (reason === 'gesundheit') return { icon: '🏥', title: 'Nützt ja nichts.', text: 'Der Lebe-ich-noch-Index empfiehlt dringend ein Einzelzimmer. Privatpatient wäre jetzt praktisch.' };
  if (reason === 'pleite') return { icon: '🧾', title: 'Familieninsolvenz mit Herz', text: 'Die emotionale Bilanz war vielleicht besser als die echte. Vielleicht.' };
  if (reason === 'sinn') return { icon: '🫥', title: 'Existenzielle Kernschmelze', text: 'Der Sinn-Index war zu lange negativ. Markus schlägt Samstag grillen vor.' };
  if (index >= 78) return { icon: '🥂', title: 'Sekt aus der Schnabeltasse!', text: 'Es ergibt Sinn. Nicht logisch, nicht finanziell – aber auf die wichtige Art.' };
  if (index >= 58) return { icon: '🌭', title: 'Samstag grillen.', text: 'Das Leben ist chaotisch, der Hund verdächtig und die Wurst stabilisiert das System.' };
  if (index >= 38) return { icon: '🫠', title: 'Am Leben. Leider.', text: 'Kein Glanzabschluss, aber alle sind noch da. Das zählt hier bereits als Managementleistung.' };
  return { icon: '🥴', title: 'Everyone’s genervt.', text: 'Der Alltag hat die Bilanz gewonnen. Eine Online-Runde mit Markus wäre jetzt Infrastruktur.' };
}

function Meter({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'hot' | 'dog' }) {
  const display = tone === 'dog' ? (value + 100) / 2 : value;
  return (
    <div className="meter">
      <div className="meter-label"><span>{label}</span><b>{Math.round(value)}</b></div>
      <div className="meter-track"><i className={tone} style={{ width: `${clamp(display)}%` }} /></div>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<string[]>(['Das Haus hält. Noch.']);
  const [childRevenue, setChildRevenue] = useState(0);
  const [controllerBroken, setControllerBroken] = useState(false);
  const [beers, setBeers] = useState(0);
  const [actionsDone, setActionsDone] = useState<Record<string, number>>({});
  const [negativeSeconds, setNegativeSeconds] = useState(0);
  const [endReason, setEndReason] = useState('zeit');
  const [highScore, setHighScore] = useState(0);
  const eventAt = useRef(12);
  const lastEvent = useRef('');
  const audioRef = useRef<AudioContext | null>(null);

  const meaning = useMemo(() => getMeaning(stats), [stats]);
  const dogRank = getDogRank(stats.hund);
  const lifeRank = getLifeRank(stats);
  const ending = endingFor(meaning, stats, endReason);

  const blip = useCallback((kind: 'good' | 'bad' | 'click' = 'click') => {
    if (!sound || typeof window === 'undefined') return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = audioRef.current ?? new AudioCtor();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = kind === 'good' ? 620 : kind === 'bad' ? 150 : 330;
      gain.gain.setValueAtTime(.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .08);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + .085);
    } catch { /* Sound is optional. */ }
  }, [sound]);

  const addLog = useCallback((message: string) => {
    setLogs((current) => [message, ...current].slice(0, 5));
  }, []);

  const finish = useCallback((reason = 'zeit') => {
    setEndReason(reason);
    setPhase('ended');
    setPaused(false);
    setActiveEvent(null);
    blip(reason === 'zeit' ? 'good' : 'bad');
  }, [blip]);

  const resetGame = useCallback(() => {
    setStats(INITIAL_STATS);
    setElapsed(0);
    setPaused(false);
    setActiveEvent(null);
    setCooldowns({});
    setLogs(['07:00 Uhr. Niemand weiß, warum Fenja schon wach ist.']);
    setChildRevenue(0);
    setControllerBroken(false);
    setBeers(0);
    setActionsDone({});
    setNegativeSeconds(0);
    setEndReason('zeit');
    eventAt.current = 12;
    lastEvent.current = '';
    setPhase('playing');
    blip('good');
  }, [blip]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setHighScore(Number(localStorage.getItem('schnabeltasse-highscore') || 0)); } catch { /* local score is optional */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== 'ended') return;
    const nextHigh = Math.max(highScore, meaning);
    const timer = window.setTimeout(() => {
      setHighScore(nextHigh);
      try { localStorage.setItem('schnabeltasse-highscore', String(nextHigh)); } catch { /* local score is optional */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [phase, meaning, highScore]);

  useEffect(() => {
    if (phase !== 'playing' || paused || activeEvent) return;
    const timer = window.setInterval(() => {
      setElapsed((current) => {
        const next = current + 1;
        if (next >= eventAt.current) {
          const available = EVENTS.filter((event) => event.id !== lastEvent.current);
          const picked = available[Math.floor(Math.random() * available.length)];
          lastEvent.current = picked.id;
          eventAt.current = next + 14 + Math.floor(Math.random() * 5);
          setActiveEvent(picked);
          blip('bad');
        }
        return next;
      });

      setCooldowns((current) => Object.fromEntries(
        Object.entries(current).map(([id, value]) => [id, Math.max(0, value - 1)])
      ));

      setStats((current) => {
        const next = patchStats(current, {
          geld: -(1000 / 60) - (2100 / 60) - (180 / 60),
          energie: -.18,
          haushalt: -.26,
          sinn: current.familie < 30 || current.geld < 0 ? -.34 : -.05,
          familie: current.haushalt < 28 ? -.23 : -.03,
          gesundheit: current.hitze > 72 ? -.75 : current.energie < 18 ? -.35 : .02,
          hitze: -.12,
          hund: -.07,
        });
        if (getMeaning(next) <= 20) setNegativeSeconds((value) => value + 1);
        else setNegativeSeconds((value) => Math.max(0, value - 2));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, paused, activeEvent, blip]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const reason = elapsed >= SHIFT_SECONDS ? 'zeit'
      : stats.gesundheit <= 0 || stats.hitze >= 100 ? 'gesundheit'
        : stats.geld <= -3500 ? 'pleite'
          : negativeSeconds >= 22 ? 'sinn' : null;
    if (!reason) return;
    const timer = window.setTimeout(() => finish(reason), 0);
    return () => window.clearTimeout(timer);
  }, [elapsed, stats.gesundheit, stats.hitze, stats.geld, negativeSeconds, phase, finish]);

  const doAction = useCallback((action: Action) => {
    if (phase !== 'playing' || paused || activeEvent || (cooldowns[action.id] ?? 0) > 0) return;
    if (action.id === 'konsole' && controllerBroken) {
      setStats((current) => patchStats(current, { geld: -320, sinn: -2 }));
      setControllerBroken(false);
      setCooldowns((current) => ({ ...current, konsole: 5 }));
      addLog('Controller für 320 € ersetzt. Fenja beobachtet die Lieferverfolgung.');
      blip('bad');
      return;
    }

    let effects = { ...action.effects };
    if (action.id === 'gym' && stats.hitze > 65) effects = { ...effects, gesundheit: -13, hitze: 28, sinn: -2 };
    if (action.id === 'bier') {
      setBeers((count) => count + 1);
      if (beers >= 2) effects = { ...effects, gesundheit: -13, sinn: 2, energie: -3 };
    }
    if (action.id === 'kinder') setChildRevenue((value) => value + 50);

    setStats((current) => patchStats(current, effects));
    setCooldowns((current) => ({ ...current, [action.id]: action.cooldown }));
    setActionsDone((current) => ({ ...current, [action.id]: (current[action.id] ?? 0) + 1 }));
    addLog(action.log);
    blip((effects.sinn ?? 0) >= 0 ? 'good' : 'bad');
  }, [phase, paused, activeEvent, cooldowns, controllerBroken, stats.hitze, beers, addLog, blip]);

  const chooseEvent = useCallback((choice: Choice) => {
    setStats((current) => patchStats(current, choice.effects));
    if (choice.revenue) setChildRevenue((value) => value + (choice.revenue ?? 0));
    if (choice.controllerBroken) setControllerBroken(true);
    addLog(choice.log);
    setActiveEvent(null);
    blip((choice.effects.sinn ?? 0) + (choice.effects.familie ?? 0) >= 0 ? 'good' : 'bad');
  }, [addLog, blip]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (activeEvent && (event.key === '1' || event.key === '2')) {
        chooseEvent(activeEvent.choices[Number(event.key) - 1]);
        return;
      }
      if (event.key === ' ' && phase === 'playing' && !activeEvent) {
        event.preventDefault();
        setPaused((value) => !value);
        return;
      }
      const action = ACTIONS.find((item) => item.key === event.key);
      if (action) doAction(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, activeEvent, doAction, chooseEvent]);

  const goals = [
    { done: stats.gesundheit > 35, label: 'Noch am Leben' },
    { done: stats.hund >= -24, label: 'Fenja mindestens Okayi' },
    { done: stats.familie >= 68 || (actionsDone.familie ?? 0) >= 2, label: 'Echter Familienmoment' },
    { done: stats.geld >= 0, label: 'Nicht völlig pleite' },
    { done: childRevenue >= 100, label: 'Kinder: 100 € Umsatz' },
  ];

  return (
    <main className={`game-shell phase-${phase}`}>
      <header className="topbar">
        <div className="brand">
          <span className="eyebrow">FAMILIEN-SURVIVAL-SIMULATION</span>
          <strong>SEKT AUS DER SCHNABELTASSE</strong>
        </div>

        {phase !== 'intro' && (
          <div className="hud-summary">
            <div className={`meaning-badge score-${meaning < 35 ? 'low' : meaning > 69 ? 'high' : 'mid'}`}>
              <span>SINN-INDEX</span><b>{meaning}</b>
            </div>
            <div className="clock"><span>SCHICHTENDE</span><b>{formatTime(elapsed)}</b></div>
          </div>
        )}

        <nav className="controls" aria-label="Spielsteuerung">
          <button onClick={() => setSound((value) => !value)} aria-label={sound ? 'Ton ausschalten' : 'Ton einschalten'}>{sound ? '♪' : '×♪'}</button>
          {phase === 'playing' && <button onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Fortsetzen' : 'Pause'}>{paused ? '▶' : 'Ⅱ'}</button>}
          <button onClick={() => setRulesOpen(true)} aria-label="Spielregeln">?</button>
        </nav>
      </header>

      <section className="stage" aria-label="Chaotisches Familienwohnzimmer">
        <Image className="scene-image" src="/family-home.png" alt="Pixel-Art-Wohnung einer chaotischen Familie" fill priority sizes="100vw" />
        <div className="scene-shade" />

        {phase === 'playing' && (
          <>
            <aside className="stats-panel pixel-panel" aria-label="Zustandswerte">
              <div className="panel-heading"><span>LEBE ICH NOCH?</span><b className={`life-${lifeRank === 'AM LEBEN' ? 'good' : 'bad'}`}>{lifeRank}</b></div>
              <Meter label="GESUNDHEIT" value={stats.gesundheit} />
              <Meter label="ENERGIE" value={stats.energie} />
              <Meter label="FAMILIE" value={stats.familie} />
              <Meter label="HAUSHALT" value={stats.haushalt} />
              <Meter label="HITZE" value={stats.hitze} tone="hot" />
              <Meter label={`FENJA: ${dogRank}`} value={stats.hund} tone="dog" />
              <div className="money-row"><span>GELD</span><b className={stats.geld < 0 ? 'negative' : ''}>{formatMoney(stats.geld)}</b></div>
              <small>−1.000 €/Min Frau · −2.100 €/Min Kinder · −180 €/Min Hund</small>
            </aside>

            <aside className="goals-panel pixel-panel" aria-label="Tagesziele">
              <div className="panel-heading"><span>TAGESZIELE</span><b>{goals.filter((goal) => goal.done).length}/5</b></div>
              <ul>{goals.map((goal) => <li className={goal.done ? 'done' : ''} key={goal.label}><i>{goal.done ? '✓' : '·'}</i>{goal.label}</li>)}</ul>
              <div className="child-pnl">
                <span>KINDER-PNL</span>
                <b>−{(2100 - childRevenue).toLocaleString('de-DE')} €/MIN*</b>
                <small>*emotional genaue Fantasiebuchhaltung</small>
              </div>
            </aside>

            <div className="hotspots" aria-label="Aktionen in der Wohnung">
              {ACTIONS.map((action) => {
                const cooldown = cooldowns[action.id] ?? 0;
                const broken = action.id === 'konsole' && controllerBroken;
                return (
                  <button
                    key={action.id}
                    className={`hotspot ${action.position} ${cooldown > 0 ? 'cooling' : ''}`}
                    onClick={() => doAction(action)}
                    disabled={cooldown > 0 || paused}
                    aria-label={`${action.label}: ${broken ? 'Controller ersetzen' : action.description}`}
                  >
                    <span className="hotspot-key">{action.key}</span>
                    <span className="hotspot-icon">{broken ? '🪛' : action.icon}</span>
                    <span className="hotspot-copy"><b>{broken ? 'Controller ersetzen' : action.label}</b><small>{cooldown > 0 ? `${cooldown}s` : broken ? '−320 €' : action.description}</small></span>
                  </button>
                );
              })}
            </div>

            <section className="log-panel pixel-panel" aria-live="polite" aria-label="Familienprotokoll">
              <span className="log-label">LIVE AUS DEM HAUSHALT</span>
              <p>{logs[0]}</p>
            </section>
          </>
        )}

        {phase === 'intro' && (
          <section className="intro-panel">
            <span className="intro-kicker">EINE GANZ NORMALE FAMILIE. LEIDER.</span>
            <h1>Ergibt das hier<br /><em>Sinn?</em></h1>
            <p>
              Drei Kinder. Ein junger Hund namens Fenja. Eine Frau, die laut Bilanz 1.000 Geld die Minute kostet
              und praktisch das ganze System zusammenhält. Du bist Vater, Dr., Grillmeister – und
              immer noch kein Professor.
            </p>
            <button className="start-button" onClick={resetGame}>SCHICHT BEGINNEN <span>→</span></button>
            <button className="text-button" onClick={() => setRulesOpen(true)}>Wie überlebt man das?</button>
            <small>Beste Runde: {highScore || '—'} Sinn · keine flackernden Lichter · Tastatur & Touch</small>
          </section>
        )}

        {phase === 'ended' && (
          <section className="ending-panel pixel-panel" role="dialog" aria-modal="true" aria-label="Spielergebnis">
            <span className="ending-icon">{ending.icon}</span>
            <span className="intro-kicker">SCHICHT BEENDET · SINN-INDEX {meaning}</span>
            <h1>{ending.title}</h1>
            <p>{ending.text}</p>
            <div className="ending-grid">
              <div><span>LEBE ICH NOCH?</span><b>{lifeRank}</b></div>
              <div><span>HUND</span><b>{dogRank}</b></div>
              <div><span>FAMILIENLAGE</span><b>{Math.round(stats.familie)}/100</b></div>
              <div><span>KONTO</span><b>{formatMoney(stats.geld)}</b></div>
            </div>
            <p className="verdict">ERGIBT MEIN LEBEN SINN? <b>{meaning >= 55 ? 'JA. IRGENDWIE.' : 'NOCH NICHT.'}</b></p>
            <button className="start-button" onClick={resetGame}>NOCH EINE SCHICHT <span>↻</span></button>
          </section>
        )}

        {paused && phase === 'playing' && !activeEvent && (
          <div className="pause-card" role="status"><b>PAUSE</b><span>Selbst der Sinn braucht kurz Luft.</span><button onClick={() => setPaused(false)}>WEITER</button></div>
        )}

        {activeEvent && phase === 'playing' && (
          <section className="event-card pixel-panel" role="dialog" aria-modal="true" aria-labelledby="event-title">
            <span className="event-icon">{activeEvent.icon}</span>
            <span className="intro-kicker">{activeEvent.kicker}</span>
            <h2 id="event-title">{activeEvent.title}</h2>
            <p>{activeEvent.text}</p>
            <div className="event-choices">
              {activeEvent.choices.map((choice, index) => (
                <button key={choice.label} onClick={() => chooseEvent(choice)}>
                  <i>{index + 1}</i><span><b>{choice.label}</b><small>{choice.hint}</small></span><em>→</em>
                </button>
              ))}
            </div>
          </section>
        )}

        {rulesOpen && (
          <section className="rules-card pixel-panel" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="close-button" onClick={() => setRulesOpen(false)} aria-label="Regeln schließen">×</button>
            <span className="intro-kicker">DIENSTANWEISUNG</span>
            <h2 id="rules-title">Wie der Bums funktioniert</h2>
            <ol>
              <li><b>Sinn über 0 halten.</b><span>Familie, Gesundheit, Hund, Geld und eigene Freude zählen gemeinsam.</span></li>
              <li><b>Drei Minuten durchhalten.</b><span>Jede Aktion hat Folgen und eine kurze Abklingzeit.</span></li>
              <li><b>Hitze ernst nehmen.</b><span>Zu viel Sport und Grillen ohne Pause kann im Krankenhaus enden.</span></li>
              <li><b>Bedürfnisse statt Etiketten.</b><span>Paul braucht Rückzug, Theo Bewegung, Friedrich Nähe – alle drei bringen mehr als Fantasieumsatz.</span></li>
            </ol>
            <div className="key-help"><kbd>1–9</kbd> Aktionen <kbd>Leertaste</kbd> Pause</div>
            <button className="start-button" onClick={() => setRulesOpen(false)}>VERSTANDEN <span>✓</span></button>
          </section>
        )}
      </section>

      <footer className="status-strip">
        <span><i className={`dot ${lifeRank !== 'AM LEBEN' ? 'warning' : ''}`} /> LEBE ICH NOCH? <b>{phase === 'intro' ? 'UNGEKLÄRT' : lifeRank}</b></span>
        <span>FRAU <b>−1.000 €/MIN</b></span>
        <span>FENJA <b>{phase === 'intro' ? 'OKAYI?' : dogRank}</b></span>
        <span>ZWILLINGSBRUDER <b>PROFESSOR 🙄</b></span>
      </footer>
    </main>
  );
}
