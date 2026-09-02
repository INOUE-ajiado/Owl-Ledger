import { useEffect } from 'react';
import type { UseFormReturn, Path, PathValue } from 'react-hook-form';
import type { BreakdownItem } from '../../../types';
import type { ProjectFormValues } from './types';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

export const useProjectCalculations = ({ watch, setValue, getValues }: UseFormReturn<ProjectFormValues>) => {
  
  const watchedValues = watch();
  
  const breakdownJson = JSON.stringify(watchedValues.breakdown || []);
  const {
    projectType,
    gloss,
    allocatedAmount,
    taxType,
    marginRate,
    negotiationFeeRate,
  } = watchedValues;

  useEffect(() => {
    const currentValues = getValues();
    const {
      projectType,
      gloss = 0,
      allocatedAmount = 0,
      taxType = 'exclusive',
      marginRate = 0,
      characterCount = 1,
      negotiationFeeRate = 0,
      breakdown = [],
    } = currentValues;

    const items = breakdown;

    const safeSetValue = (key: Path<ProjectFormValues>, newValue: string | number) => {
      if (getValues(key) !== newValue) {
        setValue(key, newValue as PathValue<ProjectFormValues, typeof key>);
      }
    };

    if (projectType === 'internal_sale') {
      const totalAmount = items.reduce((sum: number, item: BreakdownItem) => sum + (Number(item.amount) || 0), 0);
      safeSetValue('gloss', totalAmount);

    } else if (projectType === 'sub') {
      const totalNet = items.reduce((sum: number, item: BreakdownItem) => sum + (Number(item.amount) || 0), 0);
      const margin = allocatedAmount - totalNet;
      const newMarginRate = allocatedAmount > 0 ? (margin / allocatedAmount) * 100 : 0;
      
      safeSetValue('marginRate', newMarginRate);

      items.forEach((_: BreakdownItem, index: number) => {
        const itemAmount = getValues(`breakdown.${index}.amount`) || 0;
        const newPercentage = totalNet > 0 ? (itemAmount / totalNet) * 100 : 0;
        const currentPercentage = getValues(`breakdown.${index}.percentage`);
        if (currentPercentage !== newPercentage) {
           setValue(`breakdown.${index}.percentage`, newPercentage);
        }
      });
      
      const negotiationFeeRaw = allocatedAmount * (negotiationFeeRate / 100);
      const negotiationFee = Math.max(4000, Math.min(10000, negotiationFeeRaw));
      safeSetValue('margin', formatCurrency(margin - negotiationFee));
      safeSetValue('net', formatCurrency(totalNet));
      safeSetValue('netUnitPrice', formatCurrency(totalNet / characterCount));
      safeSetValue('negotiationFee', formatCurrency(negotiationFee));
      safeSetValue('netRate', 100 - newMarginRate);

    } else {
      const glossExclusive = taxType === 'inclusive' ? gloss / 1.1 : gloss;
      const netTotal = glossExclusive * ((100 - marginRate) / 100);
      const margin = glossExclusive - netTotal;
      
      if (items.length > 0) {
        const childAmountsSum = items.slice(1).reduce((sum: number, item: BreakdownItem) => sum + (Number(item.amount) || 0), 0);
        const newParentAmount = netTotal - childAmountsSum;
        
        const currentParentAmount = getValues('breakdown.0.amount');
        if (currentParentAmount !== newParentAmount) {
           setValue('breakdown.0.amount', newParentAmount);
        }

        items.forEach((_: BreakdownItem, index: number) => {
            const itemAmount = getValues(`breakdown.${index}.amount`) || 0;
            const newPercentage = netTotal > 0 ? (itemAmount / netTotal) * 100 : 0;
            const currentPercentage = getValues(`breakdown.${index}.percentage`);
            if (currentPercentage !== newPercentage) {
               setValue(`breakdown.${index}.percentage`, newPercentage);
            }
        });
      }
      
      const negotiationFeeRaw = glossExclusive * (negotiationFeeRate / 100);
      const negotiationFee = Math.max(4000, Math.min(10000, negotiationFeeRaw));
      safeSetValue('margin', formatCurrency(margin - negotiationFee));
      safeSetValue('net', formatCurrency(netTotal));
      safeSetValue('netUnitPrice', formatCurrency(netTotal / characterCount));
      safeSetValue('negotiationFee', formatCurrency(negotiationFee));
      safeSetValue('netRate', 100 - marginRate);
    }

  }, [
    projectType, 
    gloss, 
    allocatedAmount, 
    taxType, 
    marginRate, 
    breakdownJson, 
    negotiationFeeRate,
    setValue, 
    getValues
  ]);
};