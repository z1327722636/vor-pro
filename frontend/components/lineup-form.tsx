"use client";

import { useState } from "react";
import { Dropdown } from "@/components/dropdown";
import { agentAbilityOptions, agentOptions, mapOptions, sideOptions, siteOptions, throwOptions } from "@/lib/labels";

const defaultAgent = agentOptions[0]?.value ?? "sova";

export type LineupBaseValue = {
  map: string;
  site: string;
  side: string;
  agent: string;
  ability: string;
  throw_type: string;
};

export function defaultLineupBaseValue(): LineupBaseValue {
  const agent = defaultAgent;
  return {
    map: mapOptions[0]?.value ?? "ascent",
    site: "a",
    side: "attack",
    agent,
    ability: agentAbilityOptions[agent]?.[0]?.value ?? "",
    throw_type: throwOptions[0]?.value ?? "direct"
  };
}

type LineupBaseFieldsProps = {
  value?: LineupBaseValue;
  onChange?: (value: LineupBaseValue) => void;
  columnsClassName?: string;
};

export function LineupBaseFields({ value, onChange, columnsClassName = "md:grid-cols-3" }: LineupBaseFieldsProps = {}) {
  const [internalValue, setInternalValue] = useState<LineupBaseValue>(() => defaultLineupBaseValue());
  const current = value ?? internalValue;
  const abilityOptions = agentAbilityOptions[current.agent] ?? [];

  function updateField(key: keyof LineupBaseValue, nextValue: string) {
    const next = { ...current, [key]: nextValue };
    if (key === "agent") next.ability = agentAbilityOptions[nextValue]?.[0]?.value ?? "";
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  }

  return (
    <div className={`grid gap-4 ${columnsClassName}`}>
      <Dropdown name="map" value={current.map} options={mapOptions} ariaLabel="选择地图" onValueChange={(next) => updateField("map", next)} />
      <Dropdown name="site" value={current.site} options={siteOptions} ariaLabel="选择点位" onValueChange={(next) => updateField("site", next)} />
      <Dropdown name="side" value={current.side} options={sideOptions} ariaLabel="选择攻防方" onValueChange={(next) => updateField("side", next)} />
      <Dropdown name="agent" value={current.agent} options={agentOptions} ariaLabel="选择英雄" onValueChange={(next) => updateField("agent", next)} />
      <Dropdown key={current.agent} name="ability" value={current.ability} options={abilityOptions} ariaLabel="选择技能" onValueChange={(next) => updateField("ability", next)} />
      <Dropdown name="throw_type" value={current.throw_type} options={throwOptions} ariaLabel="选择投掷方式" onValueChange={(next) => updateField("throw_type", next)} />
    </div>
  );
}

export function LineupFormFields() {
  return (
    <>
      <LineupBaseFields />
      <div className="grid gap-4 md:grid-cols-2">
        <textarea name="standing_description" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none" placeholder="站位备注" />
        <textarea name="aim_description" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none" placeholder="瞄准备注" />
        <textarea name="landing_description" className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none" placeholder="落点备注" />
      </div>
    </>
  );
}
