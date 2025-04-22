
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomProvider } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  newProvider: CustomProvider;
  setNewProvider: (v: CustomProvider) => void;
  onAdd: () => void;
}

export const AICustomModelDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  newProvider,
  setNewProvider,
  onAdd,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>添加自定义AI模型</DialogTitle>
        <DialogDescription>
          添加您自己的API端点和配置，以连接其他大语言模型。
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="custom-id">模型标识符 (ID)</Label>
          <Input
            id="custom-id"
            placeholder="例如: my-model"
            value={newProvider.id}
            onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-name">模型名称</Label>
          <Input
            id="custom-name"
            placeholder="例如: 我的自定义模型"
            value={newProvider.name}
            onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="custom-endpoint">API 端点</Label>
          <Input
            id="custom-endpoint"
            placeholder="例如: https://api.example.com/v1/chat"
            value={newProvider.endpoint}
            onChange={(e) => setNewProvider({ ...newProvider, endpoint: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
        <Button onClick={onAdd}>添加</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
