// 特産品と地域のデータセット
export interface FoodItem {
  id: string;
  name: string;
  regions: Region[];
  imageQuery: string;
}

export interface Region {
  id: string;
  name: string;
  prefecture: string;
  description: string;
  lat: number;
  lng: number;
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  address: string;
  lat: number;
  lng: number;
}

export interface Hotel {
  id: string;
  name: string;
  rating: number;
  price: number;
  address: string;
  lat: number;
  lng: number;
  imageQuery: string;
}

export const foodData: FoodItem[] = [
  {
    id: 'oyster',
    name: 'かき',
    imageQuery: 'fresh oyster seafood',
    regions: [
      {
        id: 'hiroshima',
        name: '広島',
        prefecture: '広島県',
        description: '日本一のかき生産地',
        lat: 34.3853,
        lng: 132.4553,
      },
      {
        id: 'miyagi',
        name: '松島',
        prefecture: '宮城県',
        description: '松島湾の新鮮なかき',
        lat: 38.3683,
        lng: 141.0639,
      },
    ],
  },
  {
    id: 'apple',
    name: 'りんご',
    imageQuery: 'red apple fruit',
    regions: [
      {
        id: 'aomori',
        name: '青森',
        prefecture: '青森県',
        description: 'りんご生産量日本一',
        lat: 40.8244,
        lng: 140.7400,
      },
      {
        id: 'nagano',
        name: '長野',
        prefecture: '長野県',
        description: '信州りんごで有名',
        lat: 36.6513,
        lng: 138.1809,
      },
    ],
  },
  {
    id: 'uni',
    name: 'うに',
    imageQuery: 'sea urchin sushi',
    regions: [
      {
        id: 'hokkaido-uni',
        name: '利尻・礼文',
        prefecture: '北海道',
        description: '最高級うにの産地',
        lat: 45.1833,
        lng: 141.2000,
      },
      {
        id: 'yamaguchi',
        name: '下関',
        prefecture: '山口県',
        description: '日本海の新鮮なうに',
        lat: 33.9508,
        lng: 130.9492,
      },
    ],
  },
  {
    id: 'wagyu',
    name: '和牛',
    imageQuery: 'wagyu beef steak',
    regions: [
      {
        id: 'kobe',
        name: '神戸',
        prefecture: '兵庫県',
        description: '世界的に有名な神戸ビーフ',
        lat: 34.6901,
        lng: 135.1955,
      },
      {
        id: 'matsusaka',
        name: '松阪',
        prefecture: '三重県',
        description: '最高級の松阪牛',
        lat: 34.5783,
        lng: 136.5258,
      },
    ],
  },
  {
    id: 'crab',
    name: 'かに',
    imageQuery: 'fresh crab seafood',
    regions: [
      {
        id: 'tottori',
        name: '鳥取',
        prefecture: '鳥取県',
        description: '松葉ガニの本場',
        lat: 35.5014,
        lng: 134.2378,
      },
      {
        id: 'hokkaido-crab',
        name: '北海道',
        prefecture: '北海道',
        description: 'タラバガニ・ズワイガニの宝庫',
        lat: 43.0642,
        lng: 141.3469,
      },
    ],
  },
];

// モックレストランデータ
export const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'かき小屋 海鮮亭',
    rating: 4.5,
    address: '広島県広島市中区本通1-1',
    lat: 34.3953,
    lng: 132.4553,
  },
  {
    id: 'r2',
    name: '牡蠣処 瀬戸内',
    rating: 4.8,
    address: '広島県広島市中区紙屋町2-2',
    lat: 34.3953,
    lng: 132.4603,
  },
  {
    id: 'r3',
    name: 'オイスターバー 広島',
    rating: 4.3,
    address: '広島県広島市中区八丁堀3-3',
    lat: 34.3903,
    lng: 132.4603,
  },
];

// モックホテルデータ
export const mockHotels: Hotel[] = [
  {
    id: 'h1',
    name: 'グランドホテル 広島',
    rating: 4.6,
    price: 12000,
    address: '広島県広島市中区中町1-5',
    lat: 34.3933,
    lng: 132.4583,
    imageQuery: 'modern hotel room',
  },
  {
    id: 'h2',
    name: 'シェラトンホテル広島',
    rating: 4.7,
    price: 15000,
    address: '広島県広島市東区若草町2-10',
    lat: 34.3963,
    lng: 132.4633,
    imageQuery: 'luxury hotel bedroom',
  },
  {
    id: 'h3',
    name: 'ビジネスホテル 瀬戸',
    rating: 4.0,
    price: 8000,
    address: '広島県広島市中区大手町3-15',
    lat: 34.3883,
    lng: 132.4533,
    imageQuery: 'business hotel room',
  },
];
