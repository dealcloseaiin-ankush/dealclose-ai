export default function PromptEditor({ value, onChange }) {
  return (
    <textarea 
      value={value}
      onChange={onChange}
      placeholder="Describe the video you want to generate (e.g., 'A futuristic city with flying cars')..."
      className="w-full h-32 p-3 border rounded focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
    />
  );
}