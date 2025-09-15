export default function QuizResultModal({ open, score, onClose }) {
  if (!open) return null;
  const pct = Math.round((score.correct / Math.max(1, score.total)) * 100);
  const color = pct >= 80 ? "text-green-600" : pct >= 65 ? "text-amber-600" : pct >= 50 ? "text-orange-600" : "text-red-600";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-[92%] p-6 text-center">
        <h3 className="text-xl font-bold text-[#2B2D42]">Quiz Results</h3>
        <p className="mt-2 text-gray-600">Here’s how you did:</p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <span className={`text-4xl font-extrabold ${color}`}>
            {score.correct} / {score.total}
          </span>
          <span className="text-sm text-gray-500">{pct}% Correct</span>
        </div>

        <div className="mt-6">
          <button
            onClick={onClose}
            className="group relative inline-flex items-center gap-2 rounded-xl px-5 py-2 font-semibold text-white 
                       bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6] hover:shadow-lg transition"
          >
            Close & Exit
          </button>
        </div>
      </div>
    </div>
  );
}
