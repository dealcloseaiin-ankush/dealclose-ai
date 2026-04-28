import Button from '../../components/Button';

export default function ExportPanel() {
  const handleExport = () => {
    alert('Exporting ad... (This would download the canvas image)');
  };

  return (
    <div>
      <h2 className="font-bold mb-2">Export</h2>
      <Button onClick={handleExport} className="w-full">Download Image</Button>
    </div>
  );
}