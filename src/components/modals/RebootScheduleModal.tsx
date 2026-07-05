import React, { useState, useEffect } from 'react';
import { Clock, Loader2, Check, AlertTriangle, Save, Calendar, Settings, Power } from 'lucide-react';
import { useSystemStore } from '../../stores/systemStore';
import { Dialog, DialogHeader, DialogContent, DialogFooter, Button, Toggle, Label } from '../ui';

interface RebootScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = [
  { value: 0, label: 'Dimanche' },
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

export const RebootScheduleModal: React.FC<RebootScheduleModalProps> = ({
  isOpen,
  onClose
}) => {
  const { schedule, fetchSchedule, updateSchedule } = useSystemStore();
  
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [time, setTime] = useState('03:00');
  const [days, setDays] = useState<number[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    await fetchSchedule();
    setLoading(false);
  };

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      const initialMapping = schedule.mapping || {};
      setMapping(initialMapping);

      // Derive mode and simple params
      const times = Object.values(initialMapping);
      const uniqueTimes = new Set(times);
      const scheduledDays = Object.keys(initialMapping).map(Number);

      if (uniqueTimes.size <= 1) {
        setMode('simple');
        if (uniqueTimes.size === 1) {
          setTime(times[0]);
        }
        setDays(scheduledDays);
      } else {
        setMode('advanced');
        // Default time/days for switching back to simple
        setTime('03:00');
        setDays(scheduledDays);
      }
    }
  }, [schedule]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Build final mapping based on current mode
    let finalMapping: Record<number, string> = {};

    if (mode === 'simple') {
      days.forEach(day => {
        finalMapping[day] = time;
      });
    } else {
      finalMapping = mapping;
    }

    const success = await updateSchedule({
      enabled,
      mapping: finalMapping
    });

    if (success) {
      setSuccess('Planification enregistrée');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Erreur lors de l\'enregistrement');
    }
    setSaving(false);
  };

  const toggleDay = (day: number) => {
    setDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const updateMappingDay = (day: number, newTime: string | null) => {
    setMapping(prev => {
      const next = { ...prev };
      if (newTime) {
        next[day] = newTime;
      } else {
        delete next[day];
      }
      return next;
    });
  };

  // When switching to advanced, ensure mapping is populated from simple settings if needed
  useEffect(() => {
    if (mode === 'advanced') {
      // If we switch to advanced, we populate mapping from simple state IF mapping is empty or we want to sync
      // But typically we want to preserve what was in simple mode
      const newMapping: Record<number, string> = {};
      days.forEach(day => {
        newMapping[day] = time;
      });
      // Merge with existing mapping but prioritize simple state if it was active? 
      // Actually, simple state "days" and "time" are just UI helpers.
      // If coming from simple, we should overwrite mapping with simple config
      setMapping(newMapping);
    } else {
      // Switching to simple
      // We try to find a common time or default
      const times = Object.values(mapping);
      const uniqueTimes = new Set(times);
      if (uniqueTimes.size === 1) {
        setTime(times[0]);
      }
      setDays(Object.keys(mapping).map(Number));
    }
  }, [mode]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-lg">
      <DialogHeader
        title="Redémarrage planifié"
        description="Programmer le redémarrage automatique"
        icon={<Clock size={18} className="text-primary" />}
        onClose={onClose}
      />

      <DialogContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-lg text-destructive text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-success/10 border border-success/50 rounded-lg text-success text-sm flex items-center gap-2">
                <Check size={16} />
                {success}
              </div>
            )}

            {/* Main Controls */}
            <div className="flex flex-col gap-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Power size={20} className={enabled ? "text-success" : "text-muted-foreground"} />
                  <span className="text-foreground font-medium">Activer la planification</span>
                </div>
                <Toggle checked={enabled} onChange={setEnabled} />
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/60 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <Settings size={20} className={mode === 'advanced' ? "text-primary" : "text-muted-foreground"} />
                  <div>
                    <span className="text-foreground font-medium block">Mode Avancé</span>
                    <span className="text-xs text-muted-foreground">Configuration par jour</span>
                  </div>
                </div>
                <Toggle
                  checked={mode === 'advanced'}
                  onChange={(checked) => setMode(checked ? 'advanced' : 'simple')}
                />
              </div>
            </div>

            {/* Simple Mode UI */}
            {mode === 'simple' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock size={16} />
                    Heure du redémarrage
                  </Label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary/60 border border-border rounded-xl text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar size={16} />
                    Jours d'exécution
                  </Label>
                  <div className="flex justify-between gap-1">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                          days.includes(day.value)
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-secondary/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                        title={day.label}
                      >
                        {day.label[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Mode UI */}
            {mode === 'advanced' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="flex items-center gap-2 mb-4">
                  <Calendar size={16} />
                  Configuration par jour
                </Label>
                {DAYS.map((day) => {
                  const dayEnabled = mapping[day.value] !== undefined;
                  const dayTime = mapping[day.value] || '03:00';

                  return (
                    <div key={day.value} className="flex items-center gap-4 p-3 bg-secondary/60 rounded-xl border border-border transition-colors hover:border-ring">
                      <button
                        onClick={() => updateMappingDay(day.value, dayEnabled ? null : dayTime)}
                        className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          dayEnabled ? 'bg-primary text-primary-foreground' : 'bg-accent text-transparent border border-border'
                        }`}
                      >
                        <Check size={14} />
                      </button>

                      <span className={`flex-1 font-medium ${dayEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {day.label}
                      </span>

                      <input
                        type="time"
                        value={dayTime}
                        disabled={!dayEnabled}
                        onChange={(e) => updateMappingDay(day.value, e.target.value)}
                        className={`px-3 py-1.5 bg-accent border border-border rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          dayEnabled ? 'text-foreground' : 'text-muted-foreground opacity-50'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-primary/10 border border-primary/50 rounded-lg">
              <p className="text-xs text-primary">
                <strong>Note :</strong> Cette fonctionnalité utilise le serveur du dashboard pour déclencher le redémarrage. Le dashboard doit être en cours d'exécution au moment prévu.
              </p>
            </div>
          </>
        )}
      </DialogContent>

      <DialogFooter>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving}
          icon={saving ? undefined : Save}
          className="w-full"
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          Enregistrer la planification
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
