import { useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { DateInput } from '@astryxdesign/core/DateInput';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Selector } from '@astryxdesign/core/Selector';
import { getState, update, resetAll, importJson } from '../lib/store.js';
import { PROFILES, ENVIRONMENTS } from '../lib/mission.js';
import { go } from '../app/AppContext.jsx';
import { PageIntro, READ_WIDTH } from '../ui/parts.jsx';

const FOCUS = [{ value: 'auto', label: 'Automatic: when I measure below normal' }, { value: 'on', label: 'Always on' }, { value: 'off', label: 'Off' }];

export default function Setup() {
  const s = getState();
  const [name, setName] = useState(s.profile.name);
  const [profile, setProfile] = useState(s.mission.profile);
  const [start, setStart] = useState(s.mission.start);
  const [prior, setPrior] = useState(s.mission.priorCareer || 0);
  const [dosi, setDosi] = useState(s.mission.dosimeter ?? null);
  const [focus, setFocus] = useState(s.settings.focus);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [confirming, setConfirming] = useState(false);

  const save = () => {
    update((st) => {
      st.profile.name = name.trim().slice(0, 40); st.mission.profile = profile; st.mission.start = start || st.mission.start;
      st.mission.priorCareer = Math.max(0, +prior || 0); st.mission.dosimeter = dosi == null || Number.isNaN(dosi) ? null : Math.max(0, +dosi);
      st.settings.focus = focus; st.settings.onboarded = true;
    });
    go('check');
  };
  const load = async (f) => {
    setFile(f);
    if (!f) return;
    try { importJson(await f.text()); setMsg('Data imported.'); } catch (err) { setMsg(`Import failed: ${err.message}`); }
  };

  return (
    <VStack gap={6} maxWidth={READ_WIDTH} width="100%">
      <PageIntro title="Mission setup">This sets which environment you are in, and so which rules and expected changes apply. Everything stays in this browser.</PageIntro>
      <VStack gap={4}>
        <TextInput label="Crew member" placeholder="Call sign or name" value={name} onChange={setName} />
        <Selector label="Mission" value={profile} onChange={(v) => v && setProfile(v)} options={Object.entries(PROFILES).map(([id, p]) => ({ value: id, label: p.name }))}
          description={PROFILES[profile].phases.map((p) => `${ENVIRONMENTS[p.env].name} ${p.days} days`).join(' → ')} />
        <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
          <DateInput label="Mission day 1" value={start} onChange={(v) => v && setStart(v)} min="2026-01-01" max="2039-12-31" />
          <NumberInput label="Career dose before this mission" units="mSv" value={prior} min={0} max={2000} step={1} onChange={setPrior} />
          <NumberInput label="Dosimeter total, this mission" units="mSv" isOptional value={dosi} min={0} max={5000} step={0.1} onChange={setDosi} />
          <Selector label="Focus mode" value={focus} onChange={(v) => v && setFocus(v)} options={FOCUS} />
        </Grid>
        <HStack><Button label="Save and run a check" variant="primary" size="lg" onClick={save} /></HStack>
      </VStack>
      <Divider />
      <VStack gap={3}>
        <Heading level={2}>Your data</Heading>
        <FileInput label="Import a backup" accept="application/json" value={file} onChange={load} />
        <HStack gap={3} vAlign="center" wrap="wrap">
          {confirming ? (
            <>
              <Text>Delete every reading and setting stored in this browser?</Text>
              <Button label="Yes, delete" variant="destructive" onClick={() => { resetAll(); setConfirming(false); setMsg('All data deleted.'); }} />
              <Button label="Keep my data" onClick={() => setConfirming(false)} />
            </>
          ) : <Button label="Delete all data" onClick={() => setConfirming(true)} />}
        </HStack>
        <Text type="supporting" role="status">{msg}</Text>
      </VStack>
    </VStack>
  );
}
