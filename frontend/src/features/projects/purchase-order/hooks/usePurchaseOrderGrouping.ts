import { useState } from 'react';
import type { Project } from '../../../../types';
import type { DisplayItem, GroupedItem, SingleItem } from './usePurchaseOrderData';

interface UsePurchaseOrderGroupingProps {
  project: Project;
  displayItems: DisplayItem[];
  setDisplayItems: (items: DisplayItem[]) => void;
  onSaveGrouping: (grouping: { id: string, indices: number[] }[]) => void;
}

export const usePurchaseOrderGrouping = ({ project, displayItems, setDisplayItems, onSaveGrouping }: UsePurchaseOrderGroupingProps) => {
  const [mode, setMode] = useState<'default' | 'grouping'>('default');
  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(new Set());

  // グループ情報を更新して保存用コールバックを呼ぶ
  const updateAndSaveGrouping = (newDisplayItems: DisplayItem[]) => {
    const newGrouping = newDisplayItems
      .filter((item): item is GroupedItem => 'isGroup' in item)
      .map(group => ({ id: group.id, indices: group.items.map(i => i.originalIndex) }));
    
    onSaveGrouping(newGrouping);
  };

  const resetGroupingState = () => {
    setMode('default');
    setPrimaryIndex(null);
    setCheckedIndices(new Set());
  };

  const handlePrimarySelect = (index: number) => {
    if (primaryIndex === index) {
      setPrimaryIndex(null);
    } else {
      setPrimaryIndex(index);
    }
  };

  const handleCheckboxChange = (index: number) => {
    const newChecked = new Set(checkedIndices);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIndices(newChecked);
  };

  const handleGroupingAction = () => {
    if (mode === 'default' && primaryIndex !== null) {
      setMode('grouping');
      setCheckedIndices(new Set([primaryIndex]));
    } else if (mode === 'grouping') {
      if (checkedIndices.size < 2) {
        alert("2つ以上の項目を選択してください。");
        return;
      }
      
      const itemsToGroup: SingleItem[] = [];
      project.breakdown.forEach((item, index) => {
        if (checkedIndices.has(index)) {
          itemsToGroup.push({ ...item, originalIndex: index });
        }
      });

      const newGroup: GroupedItem = { id: `group-${Date.now()}`, isGroup: true, items: itemsToGroup };
      const remainingItems = displayItems.filter(item => 'isGroup' in item || !checkedIndices.has(item.originalIndex));
      
      const getSortIndex = (item: DisplayItem): number => 'isGroup' in item ? item.items[0].originalIndex : item.originalIndex;
      const newDisplayItems = [...remainingItems, newGroup].sort((a,b) => getSortIndex(a) - getSortIndex(b));
      
      setDisplayItems(newDisplayItems);
      updateAndSaveGrouping(newDisplayItems);
      resetGroupingState();
    }
  };
  
  const handleUngroup = (groupId: string) => {
    const groupToUngroup = displayItems.find(item => 'isGroup' in item && item.id === groupId) as GroupedItem | undefined;
    if (!groupToUngroup) return;
    
    const otherItems = displayItems.filter(item => !('isGroup' in item) || item.id !== groupId);
    const ungroupedItems = groupToUngroup.items;
    
    const getSortIndex = (item: DisplayItem): number => 'isGroup' in item ? item.items[0].originalIndex : item.originalIndex;
    
    const newDisplayItems = [...otherItems, ...ungroupedItems].sort((a, b) => getSortIndex(a) - getSortIndex(b));
    setDisplayItems(newDisplayItems);
    updateAndSaveGrouping(newDisplayItems);
  };

  return {
    mode,
    primaryIndex,
    checkedIndices,
    resetGroupingState,
    handlePrimarySelect,
    handleCheckboxChange,
    handleGroupingAction,
    handleUngroup
  };
};