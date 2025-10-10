export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-2xl p-5 border border-gray-100">
      <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-200 rounded-xl mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
        <div className="h-8 w-8 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}
