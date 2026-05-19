
interface ProgressProps {
  value: number;
  className?: string;
  showPercentage?: boolean;
}

export default function Progress({ value, className = '', showPercentage = false }: ProgressProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-800/50 rounded-full h-2 border border-purple-500/20">
        <div 
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-purple-500/25"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showPercentage && (
        <span className="absolute right-0 top-0 -mt-6 text-xs text-purple-300 font-semibold">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
