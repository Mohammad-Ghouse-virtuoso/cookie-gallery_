type GiftProgressBarProps = {
  currentStep: number;
  totalSteps: number;
};

const labels = ['Recipient', 'Personal Touch', 'Delivery', 'Summary'];

export function GiftProgressBar({ currentStep, totalSteps }: GiftProgressBarProps) {
  const ratio = Math.min(1, Math.max(0, currentStep / Math.max(1, totalSteps - 1)));
  return (
    <div
      className="mb-6"
      aria-hidden="false"
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-[0.32em] text-[#8E7360] font-semibold mb-3">
        {labels.slice(0, totalSteps).map((label, index) => (
          <span key={label} className={index === currentStep ? 'text-[#3B2B1A]' : undefined}>
            {label}
          </span>
        ))}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(226,185,127,0.24)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E2B97F] via-[#D89D62] to-[#C17F46] transition-all duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-[#6B5E57]">
        <span className="font-semibold text-[#3B2B1A]">Step {currentStep + 1}</span> of {totalSteps}
      </p>
    </div>
  );
}
