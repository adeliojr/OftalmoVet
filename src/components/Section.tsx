import React from 'react';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, icon, subtitle, badge, children }) => {
  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-blue-600">{icon}</span>}
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
          </div>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      {children}
    </div>
  );
};
