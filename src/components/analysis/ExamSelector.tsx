
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ExamData {
  id: string;
  name: string;
  date: string;
}

interface ExamSelectorProps {
  exams: ExamData[];
  selectedExams: string[];
  onChange: (value: string[]) => void;
  maxSelections?: number;
}

const ExamSelector: React.FC<ExamSelectorProps> = ({
  exams,
  selectedExams,
  onChange,
  maxSelections = 4
}) => {
  const [open, setOpen] = React.useState(false);

  const toggleExam = (examId: string) => {
    if (selectedExams.includes(examId)) {
      onChange(selectedExams.filter((id) => id !== examId));
    } else {
      if (selectedExams.length < maxSelections) {
        onChange([...selectedExams, examId]);
      }
    }
  };

  const removeExam = (examId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedExams.filter((id) => id !== examId));
  };

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedExams.length > 0
              ? `已选择 ${selectedExams.length} 个考试`
              : "选择要对比的考试"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="搜索考试..." />
            <CommandEmpty>没有找到相关考试</CommandEmpty>
            <CommandGroup>
              {exams.map((exam) => (
                <CommandItem
                  key={exam.id}
                  value={exam.id}
                  onSelect={() => toggleExam(exam.id)}
                  disabled={selectedExams.length >= maxSelections && !selectedExams.includes(exam.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedExams.includes(exam.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1">{exam.name}</span>
                  <span className="text-sm text-muted-foreground">{exam.date}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedExams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedExams.map((examId) => {
            const exam = exams.find((e) => e.id === examId);
            if (!exam) return null;
            
            return (
              <Badge key={examId} variant="secondary" className="px-3 py-1">
                {exam.name}
                <button
                  className="ml-2 rounded-full hover:bg-muted"
                  onClick={(e) => removeExam(examId, e)}
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamSelector;
