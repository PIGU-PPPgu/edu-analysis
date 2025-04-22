
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { standardFields } from './utils/fileParsingUtils';

interface HeaderMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  mappings: Record<string, string>;
  onUpdateMapping: (header: string, value: string) => void;
  onConfirm: () => void;
}

const HeaderMappingDialog: React.FC<HeaderMappingDialogProps> = ({
  open,
  onOpenChange,
  headers,
  mappings,
  onUpdateMapping,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>确认字段映射</DialogTitle>
          <DialogDescription>
            请确认检测到的字段与系统字段的对应关系
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4 font-medium text-sm bg-gray-50 p-2 rounded">
            <div>原始字段</div>
            <div>系统字段</div>
          </div>
          
          {headers.map((header) => (
            <div key={header} className="grid grid-cols-2 gap-4 items-center">
              <div className="font-medium">{header}</div>
              <Select
                value={mappings[header] || ''}
                onValueChange={(value) => onUpdateMapping(header, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择对应的系统字段" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(standardFields).map(([field, aliases]) => (
                    <SelectItem key={field} value={field}>
                      {field} ({aliases[0]})
                    </SelectItem>
                  ))}
                  <SelectItem value="">忽略该字段</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button 
            onClick={onConfirm}
            className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
          >
            确认并继续
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderMappingDialog;
