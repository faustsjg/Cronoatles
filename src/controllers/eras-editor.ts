import { closeDialogs } from "@/components/dialog/dialog-helpers";
import { Layers } from "@/components/layers";
import { tip } from "@/components/tooltips";
import { unfog } from "@/renderers/overlays/fogging";
import { ensureEl } from "../utils";

function open(): void {
  closeDialogs("#erasEditor, .stable");
  renderDialog();

  ensureEl("erasGenerate").addEventListener("click", generate);
  ensureEl<HTMLInputElement>("erasSlider").addEventListener("input", onSliderInput);

  if (pack.eras?.length) showPlayback(pack.eras.length - 1);

  $("#erasEditor").dialog({
    title: "Eras",
    resizable: false,
    width: "22em",
    position: { my: "left top", at: "left+10 top+10", of: "svg", collision: "fit" },
    close: closeErasEditor
  });
}

function renderDialog(): void {
  document.getElementById("erasEditor")?.remove();
  const html = /* html */ `<div id="erasEditor" class="dialog stable">
    <div id="erasControls">
      <div data-tip="Number of political snapshots to generate, one per era">
        <label for="erasCount">Eras</label>
        <input id="erasCount" type="number" min="2" max="20" value="5" step="1" />
      </div>
      <div data-tip="How many years pass between one era and the next">
        <label for="erasYears">Years per era</label>
        <input id="erasYears" type="number" min="10" max="1000" value="100" step="10" />
      </div>
      <button id="erasGenerate">Generate</button>
    </div>
    <div id="erasPlayback" hidden>
      <input id="erasSlider" type="range" min="0" max="0" value="0" step="1" />
      <div id="erasYearLabel"></div>
    </div>
  </div>`;
  ensureEl("dialogs").insertAdjacentHTML("beforeend", html);

  document.getElementById("erasEditorStyles")?.remove();
  const style = document.createElement("style");
  style.id = "erasEditorStyles";
  style.textContent = /* css */ `
    #erasControls > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4em;
    }

    #erasControls input {
      width: 5em;
    }

    #erasGenerate {
      width: 100%;
    }

    #erasPlayback {
      margin-top: 0.6em;
    }

    #erasSlider {
      width: 100%;
    }

    #erasYearLabel {
      text-align: center;
      margin-top: 0.3em;
    }
  `;
  document.head.append(style);
}

function generate(): void {
  const validStates = pack.states?.filter(s => s.i && !s.removed) ?? [];
  if (!validStates.length) return void tip("Generate states first, then generate eras", false, "error");

  const count = ensureEl<HTMLInputElement>("erasCount").valueAsNumber;
  const years = ensureEl<HTMLInputElement>("erasYears").valueAsNumber;
  if (!count || count < 1) return void tip("<i>Eras</i> must be at least 1", false, "error");
  if (!years || years < 1) return void tip("<i>Years per era</i> must be at least 1", false, "error");

  window.Eras.generate(count, years);
  showPlayback(pack.eras!.length - 1);
}

function showPlayback(index: number): void {
  const eras = pack.eras;
  if (!eras?.length) return;

  const playback = ensureEl("erasPlayback");
  playback.hidden = false;

  const slider = ensureEl<HTMLInputElement>("erasSlider");
  slider.max = String(eras.length - 1);
  slider.value = String(index);

  selectEra(index);
}

function onSliderInput(event: Event): void {
  const index = Number((event.target as HTMLInputElement).value);
  selectEra(index);
}

// Apply one era's political snapshot to the live map and redraw. Geography
// (heights, rivers, biomes...) is untouched; only what expandStates() itself
// writes is restored, so this is the exact inverse of taking the snapshot.
function selectEra(index: number): void {
  const era = pack.eras?.[index];
  if (!era) return;

  pack.states = structuredClone(era.states);
  pack.cells.state = Uint16Array.from(era.cellsState);

  for (const burg of pack.burgs) {
    if (!burg.i || burg.removed) continue;
    burg.state = pack.cells.state[burg.cell];
  }

  unfog();
  Layers.draw("states", "borders", "provinces", "labels", "burgIcons", "military", "goods", "emblems");

  ensureEl("erasYearLabel").textContent = `Year: ${era.year}`;
}

function closeErasEditor(): void {
  $("#erasEditor").dialog("destroy");
  ensureEl("erasEditor").remove();
  document.getElementById("erasEditorStyles")?.remove();
}

export const ErasEditor = { open };
