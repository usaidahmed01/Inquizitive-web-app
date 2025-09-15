export default function ConfirmSubmitModal({ open, unanswered, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-[92%] p-6 text-center">
        <h3 className="text-lg font-semibold text-[#2B2D42]">Submit Quiz?</h3>
        <p className="mt-2 text-gray-600 text-sm">
          You have {unanswered} unanswered {unanswered === 1 ? "question" : "questions"}. 
          Are you sure you want to submit?
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm font-medium bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white 
                       bg-gradient-to-r from-[#264d8b] via-[#2E5EAA] to-[#1b4a7a] hover:shadow-md"
          >
            Submit Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
