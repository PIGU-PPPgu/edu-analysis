import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  Sparkles,
  Settings2,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'range' | 'date' | 'checkbox' | 'multiselect';
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  defaultValue?: any;
}

interface ActiveFilter {
  key: string;
  label: string;
  value: any;
  displayValue: string;
}

interface SmartFilterProps {
  data: any[];
  filterOptions: FilterOption[];
  onFilter?: (filteredData: any[], activeFilters: ActiveFilter[]) => void;
  onFiltersChange?: (filters: ActiveFilter[]) => void;
  className?: string;
  showAdvanced?: boolean;
  placeholder?: string;
}

const SmartFilter: React.FC<SmartFilterProps> = ({
  data,
  filterOptions,
  onFilter,
  onFiltersChange,
  className,
  showAdvanced = true,
  placeholder = "搜索..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [filteredData, setFilteredData] = useState(data);

  // 初始化筛选值
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    filterOptions.forEach(option => {
      if (option.defaultValue !== undefined) {
        initialValues[option.key] = option.defaultValue;
      }
    });
    setFilterValues(initialValues);
  }, [filterOptions]);

  // 应用筛选
  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterValues, data]);

  const applyFilters = () => {
    let filtered = [...data];

    // 文本搜索
    if (searchTerm.trim()) {
      filtered = filtered.filter(item => {
        return Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // 应用各种筛选条件
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const option = filterOptions.find(opt => opt.key === key);
      if (!option) return;

      switch (option.type) {
        case 'text':
          if (value.trim()) {
            filtered = filtered.filter(item =>
              String(item[key] || '').toLowerCase().includes(value.toLowerCase())
            );
          }
          break;

        case 'select':
          filtered = filtered.filter(item => item[key] === value);
          break;

        case 'multiselect':
          if (Array.isArray(value) && value.length > 0) {
            filtered = filtered.filter(item => value.includes(item[key]));
          }
          break;

        case 'range':
          if (Array.isArray(value) && value.length === 2) {
            const [min, max] = value;
            filtered = filtered.filter(item => {
              const itemValue = Number(item[key]);
              return itemValue >= min && itemValue <= max;
            });
          }
          break;

        case 'date':
          if (value instanceof Date) {
            filtered = filtered.filter(item => {
              const itemDate = new Date(item[key]);
              return itemDate.toDateString() === value.toDateString();
            });
          }
          break;

        case 'checkbox':
          if (value === true) {
            filtered = filtered.filter(item => Boolean(item[key]));
          }
          break;
      }
    });

    setFilteredData(filtered);

    // 更新活跃筛选器
    const active: ActiveFilter[] = [];
    
    if (searchTerm.trim()) {
      active.push({
        key: 'search',
        label: '搜索',
        value: searchTerm,
        displayValue: `"${searchTerm}"`
      });
    }

    Object.entries(filterValues).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const option = filterOptions.find(opt => opt.key === key);
      if (!option) return;

      let displayValue = '';
      switch (option.type) {
        case 'text':
          if (value.trim()) {
            displayValue = `"${value}"`;
          }
          break;
        case 'select':
          const selectOption = option.options?.find(opt => opt.value === value);
          displayValue = selectOption?.label || value;
          break;
        case 'multiselect':
          if (Array.isArray(value) && value.length > 0) {
            displayValue = value.length === 1 ? value[0] : `${value.length}项`;
          }
          break;
        case 'range':
          if (Array.isArray(value) && value.length === 2) {
            displayValue = `${value[0]} - ${value[1]}`;
          }
          break;
        case 'date':
          if (value instanceof Date) {
            displayValue = value.toLocaleDateString();
          }
          break;
        case 'checkbox':
          if (value === true) {
            displayValue = '已启用';
          }
          break;
      }

      if (displayValue) {
        active.push({
          key,
          label: option.label,
          value,
          displayValue
        });
      }
    });

    setActiveFilters(active);
    onFilter?.(filtered, active);
    onFiltersChange?.(active);
  };

  const updateFilterValue = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const removeFilter = (key: string) => {
    if (key === 'search') {
      setSearchTerm('');
    } else {
      setFilterValues(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterValues({});
  };

  const renderFilterInput = (option: FilterOption) => {
    const value = filterValues[option.key];

    switch (option.type) {
      case 'text':
        return (
          <Input
            placeholder={option.placeholder}
            value={value || ''}
            onChange={(e) => updateFilterValue(option.key, e.target.value)}
            className="bg-white"
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => updateFilterValue(option.key, newValue)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={option.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {option.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-32 overflow-y-auto p-2 bg-white rounded border">
            {option.options?.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${option.key}-${opt.value}`}
                  checked={Array.isArray(value) && value.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    if (checked) {
                      updateFilterValue(option.key, [...currentArray, opt.value]);
                    } else {
                      updateFilterValue(option.key, currentArray.filter(v => v !== opt.value));
                    }
                  }}
                />
                <label
                  htmlFor={`${option.key}-${opt.value}`}
                  className="text-sm cursor-pointer"
                >
                  {opt.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'range':
        const rangeValue = Array.isArray(value) ? value : [option.min || 0, option.max || 100];
        return (
          <div className="space-y-2">
            <Slider
              value={rangeValue}
              onValueChange={(newValue) => updateFilterValue(option.key, newValue)}
              min={option.min || 0}
              max={option.max || 100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{rangeValue[0]}</span>
              <span>{rangeValue[1]}</span>
            </div>
          </div>
        );

      case 'date':
        return (
          <DatePicker
            date={value}
            onDateChange={(date) => updateFilterValue(option.key, date)}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={option.key}
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateFilterValue(option.key, checked)}
            />
            <label htmlFor={option.key} className="text-sm cursor-pointer">
              {option.placeholder || '启用'}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('bg-gradient-to-br from-white to-gray-50 shadow-sm border-0', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            智能筛选
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredData.length} / {data.length}
            </Badge>
            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                重置
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* 活跃筛选器 */}
        {activeFilters.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">活跃筛选器</div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge
                  key={`${filter.key}-${index}`}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">{filter.label}: {filter.displayValue}</span>
                  <button
                    onClick={() => removeFilter(filter.key)}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 高级筛选 */}
        {showAdvanced && filterOptions.length > 0 && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full justify-between h-8"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                高级筛选
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {isAdvancedOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {filterOptions.map(option => (
                  <div key={option.key} className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {option.label}
                    </label>
                    {renderFilterInput(option)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 筛选结果统计 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {filteredData.length === data.length 
              ? `显示全部 ${data.length} 条记录`
              : `筛选后显示 ${filteredData.length} 条，共 ${data.length} 条记录`
            }
          </div>
          
          {filteredData.length !== data.length && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Sparkles className="h-3 w-3" />
              <span>已应用筛选</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartFilter; 