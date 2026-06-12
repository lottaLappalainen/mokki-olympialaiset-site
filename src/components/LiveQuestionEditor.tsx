"use client";

import { Plus, Trash2 } from "lucide-react";
import type { QuestionDraft, AnswerType } from "@/lib/db/liveEvents";

interface LiveQuestionEditorProps {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
}

const TYPE_LABELS: Record<AnswerType, string> = {
  text: "Teksti",
  number: "Numero",
  photo: "Kuva",
};

export default function LiveQuestionEditor({
  questions,
  onChange,
}: LiveQuestionEditorProps) {
  function patch(i: number, fields: Partial<QuestionDraft>) {
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...fields } : q)));
  }
  function add() {
    onChange([
      ...questions,
      {
        prompt: "",
        answer_type: "text",
        required: true,
        anonymous: false,
        photo_count: 1, // default; only used when type === "photo"
      },
    ]);
  }
  function remove(i: number) {
    onChange(questions.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q, i) => (
        <div key={i} className="card flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <input
              className="input flex-1"
              placeholder="Kysymys"
              value={q.prompt}
              onChange={(e) => patch(i, { prompt: e.target.value })}
            />
            <button
              type="button"
              aria-label="Poista kysymys"
              className="btn btn-accent px-3 shrink-0"
              onClick={() => remove(i)}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <label className="text-sm font-medium text-ink">
            Vastaustyyppi
            <select
              className="input mt-1"
              value={q.answer_type}
              onChange={(e) =>
                patch(i, { answer_type: e.target.value as AnswerType })
              }
            >
              {(["text", "number", "photo"] as AnswerType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          {/* Photo count — only for photo questions. "Exactly N photos." */}
          {q.answer_type === "photo" && (
            <label className="text-sm font-medium text-ink">
              Kuvien määrä (tarkalleen)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                className="input mt-1 w-24"
                value={q.photo_count ?? 1}
                onChange={(e) =>
                  patch(i, {
                    photo_count: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
              />
            </label>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => patch(i, { required: e.target.checked })}
              />
              Pakollinen
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={q.anonymous}
                onChange={(e) => patch(i, { anonymous: e.target.checked })}
              />
              Nimetön
            </label>
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-soft" onClick={add}>
        <Plus size={18} />
        Lisää kysymys
      </button>
    </div>
  );
}