import { useRef, useLayoutEffect } from 'react';
import type { Project, Client } from '../../../../types';
import OrderConfirmationTemplate from '../../../printing/OrderConfirmationTemplate';

interface ApprovalContentProps {
  project: Project;
  client: Client;
}

export const ApprovalContent = ({ project, client }: ApprovalContentProps) => {
  const componentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const applyScale = () => {
      const container = containerRef.current;
      const contentWrapper = componentRef.current;
      
      // 子要素（実際のテンプレート）を取得
      const content = contentWrapper?.firstElementChild as HTMLElement;

      if (container && contentWrapper && content) {
        const containerWidth = container.clientWidth;
        const contentWidth = content.offsetWidth;
        
        if (containerWidth < contentWidth) {
          const scale = containerWidth / contentWidth;
          contentWrapper.style.transformOrigin = 'top center';
          contentWrapper.style.transform = `scale(${scale})`;

          const contentHeight = content.offsetHeight;
          container.style.height = `${contentHeight * scale}px`;
        } else {
          contentWrapper.style.transform = 'none';
          container.style.height = 'auto';
        }
      }
    };

    const currentContainer = containerRef.current;
    
    // 遅延させてレンダリング完了を待つ
    const timer = setTimeout(applyScale, 50);
    window.addEventListener('resize', applyScale);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', applyScale);
      
      if (currentContainer) {
          currentContainer.style.height = 'auto';
      }
    };
  }, []); // 依存配列は空でOK（マウント時に実行）

  return (
    <div ref={containerRef} className="flex justify-center flex-1 mt-4 md:mt-0"> 
        <div ref={componentRef} className="mx-auto scaled-for-screen">
            <OrderConfirmationTemplate project={project} client={client} />
        </div>
    </div>
  );
};