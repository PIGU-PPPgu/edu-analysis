import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ModuleIntroProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  videoUrl?: string;
  tips?: string[];
  showCollapsible?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ModuleIntro({
  title,
  description,
  icon,
  videoUrl,
  tips,
  showCollapsible = true,
  children,
  className = "",
}: ModuleIntroProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  const content = (
    <>
      <p className="mb-4 text-muted-foreground">{description}</p>

      {tips && tips.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="font-medium text-sm">使用提示:</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {videoUrl && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            asChild
          >
            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="h-4 w-4" />
              观看功能演示
            </a>
          </Button>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </>
  );

  if (!showCollapsible) {
    return (
      <Card
        className={`mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 ${className}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <CardTitle>{title}</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            {!isOpen &&
              description.substring(0, 100) +
                (description.length > 100 ? "..." : "")}
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>{content}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default ModuleIntro;
