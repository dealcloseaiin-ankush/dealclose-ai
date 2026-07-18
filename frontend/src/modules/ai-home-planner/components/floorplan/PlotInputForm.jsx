import { useMemo, useState } from 'react';

const roomOptions = [
  { key: 'livingRoom', label: 'Living room' },
  { key: 'drawingRoom', label: 'Drawing room' },
  { key: 'diningArea', label: 'Dining area' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'mandir', label: 'Mandir / pooja room' },
  { key: 'storeRoom', label: 'Store room' },
  { key: 'utility', label: 'Utility / wash area' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'parking', label: 'Parking' },
  { key: 'staircase', label: 'Staircase' },
  { key: 'lobby', label: 'Lobby / family lounge' },
  { key: 'office', label: 'Office / study' },
  { key: 'servantRoom', label: 'Servant room' },
  { key: 'terraceGarden', label: 'Terrace garden' },
];

const facingOptions = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const planTypes = ['Floor plan', '3D elevation', 'Electrical plan', 'Plumbing plan', 'Full house map'];
const purposeOptions = ['Self use', 'Rental', 'Duplex', 'Commercial + Residential', 'Farmhouse'];

const emptyRoomFlags = roomOptions.reduce((acc, option) => {
  acc[option.key] = false;
  return acc;
}, {});

const createFloor = (index = 0) => ({
  id: `${Date.now()}-${index}`,
  name: index === 0 ? 'Ground floor' : `Floor ${index}`,
  bedrooms: index === 0 ? 2 : 1,
  bathrooms: index === 0 ? 2 : 1,
  attachedBathrooms: index === 0 ? 1 : 1,
  commonBathrooms: index === 0 ? 1 : 0,
  bedroomsWithDressing: index === 0 ? 1 : 0,
  masterBedroomSize: '',
  bedroomSize: '',
  kitchenSize: '',
  bathroomSize: '',
  specialRooms: {
    ...emptyRoomFlags,
    livingRoom: true,
    kitchen: true,
    staircase: true,
    parking: index === 0,
    mandir: index === 0,
    balcony: index > 0,
  },
  notes: '',
});

const fieldClass =
  'w-full rounded-xl border border-gray-700 bg-[#0f172a] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30';

const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-200';

function NumberField({ label, value, onChange, min = 0, max, helper }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className={fieldClass}
      />
      {helper && <span className="mt-1 block text-xs text-gray-500">{helper}</span>}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, required = false }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className={fieldClass}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function PlotInputForm({ initialValue, loading = false, onChange, onSubmit }) {
  const [formData, setFormData] = useState(
    initialValue || {
      plotSize: '',
      plotWidth: '',
      plotDepth: '',
      facing: 'East',
      planType: 'Full house map',
      purpose: 'Self use',
      vastuRequired: true,
      parkingRequired: true,
      floors: [createFloor(0)],
      overallNotes: '',
    }
  );

  const totalSummary = useMemo(() => {
    return formData.floors.reduce(
      (total, floor) => ({
        bedrooms: total.bedrooms + Number(floor.bedrooms || 0),
        bathrooms: total.bathrooms + Number(floor.bathrooms || 0),
        attachedBathrooms: total.attachedBathrooms + Number(floor.attachedBathrooms || 0),
        commonBathrooms: total.commonBathrooms + Number(floor.commonBathrooms || 0),
        dressingRooms: total.dressingRooms + Number(floor.bedroomsWithDressing || 0),
      }),
      { bedrooms: 0, bathrooms: 0, attachedBathrooms: 0, commonBathrooms: 0, dressingRooms: 0 }
    );
  }, [formData.floors]);

  const commit = (nextData) => {
    setFormData(nextData);
    onChange?.(nextData);
  };

  const updateRoot = (key, value) => {
    commit({ ...formData, [key]: value });
  };

  const updateFloor = (floorId, updates) => {
    commit({
      ...formData,
      floors: formData.floors.map((floor) => (floor.id === floorId ? { ...floor, ...updates } : floor)),
    });
  };

  const updateRoomFlag = (floorId, roomKey) => {
    commit({
      ...formData,
      floors: formData.floors.map((floor) =>
        floor.id === floorId
          ? {
              ...floor,
              specialRooms: {
                ...floor.specialRooms,
                [roomKey]: !floor.specialRooms[roomKey],
              },
            }
          : floor
      ),
    });
  };

  const addFloor = () => {
    commit({
      ...formData,
      floors: [...formData.floors, createFloor(formData.floors.length)],
    });
  };

  const removeFloor = (floorId) => {
    if (formData.floors.length === 1) return;
    commit({
      ...formData,
      floors: formData.floors.filter((floor) => floor.id !== floorId),
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-800 bg-[#070b14] p-5 text-white shadow-2xl md:p-6">
      <div className="flex flex-col gap-3 border-b border-gray-800 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">AI Home Planner</p>
          <h2 className="mt-1 text-2xl font-bold">House map requirements</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Plot size, floors, bedrooms, bathrooms and important rooms add karke detailed map prompt ready karein.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-[#0b1020] p-3 text-center text-xs text-gray-400 md:min-w-72 md:grid-cols-5">
          <span><strong className="block text-lg text-white">{formData.floors.length}</strong>Floors</span>
          <span><strong className="block text-lg text-white">{totalSummary.bedrooms}</strong>Beds</span>
          <span><strong className="block text-lg text-white">{totalSummary.bathrooms}</strong>Baths</span>
          <span><strong className="block text-lg text-white">{totalSummary.attachedBathrooms}</strong>Attached</span>
          <span><strong className="block text-lg text-white">{totalSummary.dressingRooms}</strong>Dressing</span>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TextField label="Plot size" value={formData.plotSize} onChange={(value) => updateRoot('plotSize', value)} placeholder="Example: 30x50 ft or 1500 sq ft" required />
        <TextField label="Plot width" value={formData.plotWidth} onChange={(value) => updateRoot('plotWidth', value)} placeholder="Example: 30 ft" />
        <TextField label="Plot depth" value={formData.plotDepth} onChange={(value) => updateRoot('plotDepth', value)} placeholder="Example: 50 ft" />
        <SelectField label="Plot facing" value={formData.facing} onChange={(value) => updateRoot('facing', value)} options={facingOptions} />
        <SelectField label="Plan type" value={formData.planType} onChange={(value) => updateRoot('planType', value)} options={planTypes} />
        <SelectField label="Purpose" value={formData.purpose} onChange={(value) => updateRoot('purpose', value)} options={purposeOptions} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-[#0b1020] px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-white">Vastu required</span>
            <span className="text-xs text-gray-500">Direction-based room placement prefer karein.</span>
          </span>
          <input
            type="checkbox"
            checked={formData.vastuRequired}
            onChange={(event) => updateRoot('vastuRequired', event.target.checked)}
            className="h-5 w-5 accent-blue-500"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-[#0b1020] px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-white">Parking required</span>
            <span className="text-xs text-gray-500">Car/bike parking ko layout mein include karein.</span>
          </span>
          <input
            type="checkbox"
            checked={formData.parkingRequired}
            onChange={(event) => updateRoot('parkingRequired', event.target.checked)}
            className="h-5 w-5 accent-blue-500"
          />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold">Floor-wise requirements</h3>
            <p className="text-sm text-gray-500">Har floor mein kya hona chahiye, yahan select karein.</p>
          </div>
          <button
            type="button"
            onClick={addFloor}
            className="rounded-xl border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20"
          >
            Add floor
          </button>
        </div>

        {formData.floors.map((floor, index) => (
          <div key={floor.id} className="rounded-2xl border border-gray-800 bg-[#0b1020] p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TextField label={`Floor ${index + 1} name`} value={floor.name} onChange={(value) => updateFloor(floor.id, { name: value })} placeholder="Ground floor" />
              <button
                type="button"
                onClick={() => removeFloor(floor.id)}
                disabled={formData.floors.length === 1}
                className="self-end rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 md:self-center"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <NumberField label="Bedrooms" value={floor.bedrooms} onChange={(value) => updateFloor(floor.id, { bedrooms: value })} />
              <NumberField label="Bathrooms" value={floor.bathrooms} onChange={(value) => updateFloor(floor.id, { bathrooms: value })} />
              <NumberField label="Attached bath" value={floor.attachedBathrooms} onChange={(value) => updateFloor(floor.id, { attachedBathrooms: value })} helper="Bedroom ke andar." />
              <NumberField label="Common bath" value={floor.commonBathrooms} onChange={(value) => updateFloor(floor.id, { commonBathrooms: value })} helper="Guest/family use." />
              <NumberField label="Dressing" value={floor.bedroomsWithDressing} onChange={(value) => updateFloor(floor.id, { bedroomsWithDressing: value })} helper="Bedroom dressing area." />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <TextField label="Master bedroom size" value={floor.masterBedroomSize} onChange={(value) => updateFloor(floor.id, { masterBedroomSize: value })} placeholder="Example: 14x16 ft" />
              <TextField label="Other bedroom size" value={floor.bedroomSize} onChange={(value) => updateFloor(floor.id, { bedroomSize: value })} placeholder="Example: 12x12 ft" />
              <TextField label="Kitchen size" value={floor.kitchenSize} onChange={(value) => updateFloor(floor.id, { kitchenSize: value })} placeholder="Example: 10x12 ft" />
              <TextField label="Bathroom size" value={floor.bathroomSize} onChange={(value) => updateFloor(floor.id, { bathroomSize: value })} placeholder="Example: 6x8 ft" />
            </div>

            <div className="mt-5">
              <span className={labelClass}>Rooms and areas to include</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {roomOptions.map((room) => (
                  <label
                    key={room.key}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                      floor.specialRooms[room.key]
                        ? 'border-blue-400/60 bg-blue-500/10 text-blue-100'
                        : 'border-gray-800 bg-[#070b14] text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(floor.specialRooms[room.key])}
                      onChange={() => updateRoomFlag(floor.id, room.key)}
                      className="h-4 w-4 accent-blue-500"
                    />
                    {room.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className={labelClass}>Floor notes</span>
              <textarea
                value={floor.notes}
                onChange={(event) => updateFloor(floor.id, { notes: event.target.value })}
                rows={3}
                placeholder="Example: front open area, lift space, rental unit entry, bigger kitchen, kids room..."
                className={`${fieldClass} min-h-24 resize-y`}
              />
            </label>
          </div>
        ))}
      </section>

      <label className="block">
        <span className={labelClass}>Overall requirements</span>
        <textarea
          value={formData.overallNotes}
          onChange={(event) => updateRoot('overallNotes', event.target.value)}
          rows={4}
          placeholder="Example: modern elevation, natural light, ventilation, separate rental entry, garden, water tank, lift provision..."
          className={`${fieldClass} min-h-28 resize-y`}
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-gray-800 pt-5 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Submit par complete payload parent component ko milega, jisse AI prompt ya API request ban sakti hai.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Generating plan...' : 'Generate house map'}
        </button>
      </div>
    </form>
  );
}
