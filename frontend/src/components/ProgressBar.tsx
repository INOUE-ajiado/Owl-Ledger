const ProgressBar = () => (
  <div className="relative w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
    <style>{`
      @keyframes progress-bar-animation {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-progress-bar {
        animation: progress-bar-animation 1.5s ease-in-out infinite;
      }
    `}</style>
    <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-600 rounded-full animate-progress-bar"></div>
  </div>
);

export default ProgressBar;