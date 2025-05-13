import { useProcessing } from '@/context/ProcessingContext';
import { ProgressDisplay } from './ProgressDisplay';

interface ProgressSectionProps {
  displayGroups?: string[];
}

export function ProgressSection({ displayGroups }: ProgressSectionProps) {
  const { processState, stageGroups } = useProcessing();
  
  if (!processState) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        尚未開始處理
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ProgressDisplay 
        state={processState}
        stageGroups={stageGroups}
        displayGroups={displayGroups}
      />
    </div>
  );
} 