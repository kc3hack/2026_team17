export default function TestPage() {
  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="p-8">
      <img
        src={`${BASE}maps/prefectures/hiroshima.png`}
        className="w-[500px]"
      />
    </div>
  );
}