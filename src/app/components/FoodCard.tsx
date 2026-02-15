import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface FoodCardProps {
  name: string;
  regionCount: number;
  imageUrl: string;
  onClick: () => void;
}

export function FoodCard({ name, regionCount, imageUrl, onClick }: FoodCardProps) {
  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="aspect-video relative overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-1">{name}</h3>
        <p className="text-sm text-gray-600">{regionCount}つの地域</p>
      </div>
    </Card>
  );
}
