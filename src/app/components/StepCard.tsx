import { ReactNode } from 'react';
import { Card } from './ui/card';

interface StepCardProps {
  icon: ReactNode;
  step: number;
  title: string;
  description: string;
}

export function StepCard({ icon, step, title, description }: StepCardProps) {
  return (
    <Card className="p-8 text-center hover:shadow-lg transition-shadow">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <h3 className="mb-3">{step}. {title}</h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
}
