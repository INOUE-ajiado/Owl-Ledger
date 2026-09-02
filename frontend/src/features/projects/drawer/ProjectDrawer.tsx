import { useEffect, useState } from 'react';
import type { Project } from '../../../types';
import { MasterProjectView } from './components/MasterProjectView';
import { StandardProjectView } from './components/StandardProjectView';

interface ProjectDrawerProps {
  project: Project | null;
  allProjects: Project[];
  onClose: () => void;
  onEdit: (project: Project) => void;
  onOpenPOModal: () => void;
}

const ProjectDrawer = ({ project, allProjects, onClose, onEdit, onOpenPOModal }: ProjectDrawerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (project) {
      setTimeout(() => setIsOpen(true), 10);
    }
  }, [project]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={handleClose}
      ></div>
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`relative w-screen max-w-2xl transform transition duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {project.projectType === 'master' 
                ? <MasterProjectView project={project} allProjects={allProjects} onClose={handleClose} onEdit={onEdit} />
                : <StandardProjectView project={project} onClose={handleClose} onEdit={onEdit} onOpenPOModal={onOpenPOModal} />
            }
        </div>
      </div>
    </div>
  );
};

export default ProjectDrawer;