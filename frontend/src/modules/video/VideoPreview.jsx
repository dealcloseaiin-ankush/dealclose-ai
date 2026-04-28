export default function VideoPreview({ url }) {
  if (!url) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
        No video generated yet
      </div>
    );
  }

  return (
    <div className="w-full rounded overflow-hidden shadow">
      <video src={url} controls className="w-full h-auto" />
    </div>
  );
}