import React, { useState, useMemo, useEffect, memo } from 'react';

// --- CONFIGURATION CONSTANTS ---
const OVERTIME_LIMIT_HOURS = 3;
const OVERTIME_RATE_AED = 500; // AED 500 for each addition hour beyond the limit
const RECIPIENT_WHATSAPP = '971509674475'; 
const MIN_CUSTOM_PRICE_AED = 55.00; // Minimum price to proceed with a custom menu
const MIN_PAX = 30; // NEW: Minimum number of guests for hall booking
const MAX_PAX = 200; // NEW: Maximum hall capacity
const DEPOSIT_RATE = 0.50; // UPDATED: 50% non-refundable deposit rate

// --- HELPER FUNCTIONS ---

// Flattens categorized menu items into a single array
const flattenItems = (categorizedItems) => {
  return Object.values(categorizedItems).flat();
};

// Formats a number into AED currency string
const formatAED = (n) => `${Number(n).toFixed(2)} AED`;

// Displays an item's price, whether it's a number or a pre-formatted string
const displayItemPrice = (price) => (typeof price === 'number' ? formatAED(price) : String(price));

// Formats a date string and returns the day of the week
const formatDateAndDay = (dateStr) => {
  if (!dateStr) return { full: '', day: ''};
  try {
    const date = new Date(dateStr + 'T00:00:00'); // Avoid timezone issues
    if (isNaN(date.getTime())) return { full: dateStr, day: 'Invalid Date' };
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const full = date.toLocaleDateString('en-US', options);
    const day = full.split(',')[0];
    return { full, day };
  } catch (e) {
    return { full: dateStr, day: '' };
  }
};

// Calculates the duration in hours between a start and end time (HH:MM format)
const calculateTotalHours = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  
  // Use a consistent date for time calculation
  const startDate = new Date(2000, 0, 1, sh, sm);
  let endDate = new Date(2000, 0, 1, eh, em);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1); // Handle overnight events
  }

  const diffMs = endDate - startDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours);
};

// --- DATA ---
// Master menu data for the "Customize" view
const masterMenuData = {
  'Welcome Drinks': [{ name: "Mint Lime", price: 4.75 },{ name: "Honey Grape", price: 2.50 },{ name: "Passion Fruit Mojito", price: 2.25 },{ name: "Ginger Pishardi", price: 1.50 },],
  Starters: [{ name: "Chicken Lollipop", price: 5.50 },{ name: "Dragon Chicken", price: 3.75 },{ name: "Injipuly Chicken", price: 5.50 },{ name: "Chicken Malai Tikka", price: 6.00 },{ name: "Chicken Tikka / Seekh", price: 3.50 },{ name: "Thai Grill Fish", price: 7.50 },{ name: "Grilled Chicken w/ Avocado", price: 4.00 },{ name: "Gobi 65", price: 5.25 },{ name: "Chilli Gobi", price: 3.50 },{ name: "Gobi Manchurian", price: 3.25 },{ name: "Crispy Fried Veg", price: 3.50 },],
  Salads: [{ name: "Garden Fresh Salad", price: 2.25 },{ name: "Green Salad", price: 2.25 },{ name: "Chef Special Salad", price: 2.25 },{ name: "Tossed Salad", price: 4.50 },{ name: "Fattoush", price: 2.50 },],
  Soups: [{ name: "Sweet Corn Soup", price: 2.75 },{ name: "Hot & Sour Soup", price: 2.75 },{ name: "Cream of Soup", price: 3.50 },],
  'Main Course': [{ name: "Achayan Chicken Curry", price: 7.50 },{ name: "Kuttanadan Kozhi Curry", price: 6.50 },{ name: "Angamaly Beef Varattu", price: 7.25 },{ name: "Angamaly Beef Ularthu", price: 5.00 },{ name: "Beef Koorka Varattu / Beef Coconut Fry", price: 6.00 },{ name: "Mutton Pepper Varattu", price: 6.75 },{ name: "Fish Mango Curry / Kumarakom Fish", price: 5.75 },{ name: "Hamour Kanthari", price: 6.50 },{ name: "Veg Khorma", price: 4.00 },{ name: "Veg Kuruma / Mushroom Masala", price: 4.00 },{ name: "Paneer Butter Masala", price: 3.50 },{ name: "Veg Fried Rice", price: 3.75 },{ name: "Ghee Rice", price: 3.25 },{ name: "Chicken Fried Rice / Noodles", price: 3.75 },{ name: "Biryani", price: 7.00 },{ name: "Kappa Thalichathu", price: 3.50 },],
  Breads: [{ name: "Kerala Porotta", price: 2.00 },{ name: "Kallappam / Idiyappam", price: 1.50 },{ name: "Chappathi / Wheat Porotta", price: 1.50 },],
  Desserts: [{ name: "Fruit Salad", price: 5.00 },{ name: "Cut Fruits", price: 2.00 },{ name: "Tender Coconut Pudding", price: 2.25 },{ name: "Gulab Jamun", price: 3.00 },{ name: "Ice Cream", price: 3.00 },],
};

// Fixed package data
const packagesData = {
  65: { title: "AED 65 Menu", itemsCount: 16, price: "65.00 AED", numericPrice: 65.00, description: "16 items included in this package", items: { 'Welcome Drinks': [{ name: "Mint Lime", price: "4.75 AED" }], Starters: [{ name: "Chicken Lollipop", price: "5.50 AED" }, { name: "Gobi 65", price: "5.25 AED" }, { name: "Gobi Manchurian", price: "3.25 AED" },], Salads: [{ name: "Tossed Salad", price: "4.50 AED" }, { name: "Garden Fresh Salad", price: "2.25 AED" },], Soups: [{ name: "Sweet Corn Soup", price: "2.75 AED" }, { name: "Hot & Sour Soup", price: "2.75 AED" },], 'Main Course': [{ name: "Achayan Chicken Curry", price: "7.50 AED" }, { name: "Angamaly Beef Varattu", price: "7.25 AED" }, { name: "Veg Khorma", price: "4.00 AED" }, { name: "Veg Fried Rice", price: "3.75 AED" },], Breads: [{ name: "Kallappam", price: "1.50 AED" }, { name: "Kerala Porotta", price: "2.00 AED" },], Desserts: [{ name: "Fruit Salad", price: "5.00 AED" }, { name: "Ice Cream", price: "3.00 AED" },], }, },
  75: { title: "AED 75 Menu", itemsCount: 21, price: "75.00 AED", numericPrice: 75.00, description: "21 items included in this premium package", items: { 'Welcome Drinks': [{ name: "Honey Grape", price: "2.50 AED" }], Starters: [{ name: "Dragon Chicken", price: "3.75 AED" }, { name: "Gobi 65", price: "5.25 AED" }, { name: "Chilli Gobi", price: "3.50 AED" },], Salads: [{ name: "Green Salad", price: "2.25 AED" }, { name: "Chef Special Salad", price: "2.25 AED" },], Soups: [{ name: "Sweet Corn Soup", price: "2.75 AED" }, { name: "Hot & Sour Soup", price: "2.75 AED" },], 'Main Course': [{ name: "Achayan Chicken Curry", price: "7.50 AED" }, { name: "Angamaly Beef Varattu", price: "7.25 AED" }, { name: "Fish Kumarakom", price: "5.75 AED" }, { name: "Hamour Kanthari", price: "6.50 AED" }, { name: "Veg Kuruma", price: "4.00 AED" }, { name: "Ghee Rice", price: "3.25 AED" }, { name: "Veg Fried Rice", price: "3.75 AED" }, { name: "Kappa Thalichathu", price: "3.50 AED" },], Breads: [{ name: "Kallappam", price: "1.50 AED" }, { name: "Kerala Porotta", price: "2.00 AED" }, { name: "Chappathi", price: "1.50 AED" },], Desserts: [{ name: "Tender Coconut Pudding", price: "2.25 AED" }, { name: "Gulab Jamun", price: "3.00 AED" },], }, },
  85: { title: "AED 85 Menu", itemsCount: 25, price: "85.00 AED", numericPrice: 85.00, description: "25 items included for a grand feast", items: { 'Welcome Drinks': [{ name: "Passion Fruit Mojito", price: "2.25 AED" }, { name: "Ginger Pishardi", price: "1.50 AED" },], Starters: [{ name: "Injipuly Chicken", price: "5.50 AED" }, { name: "Hamour Kanthari", price: "6.50 AED" }, { name: "Chicken Tikka / Seekh", price: "3.50 AED" }, { name: "Crispy Fried Veg", price: "3.50 AED" }, { name: "Gobi Manchurian", price: "3.25 AED" },], Salads: [{ name: "Garden Fresh Salad", price: "2.25 AED" }, { name: "Chef Special Salad", price: "2.25 AED" }, { name: "Fattoush", price: "2.50 AED" },], Soups: [{ name: "Sweet Corn Soup", price: "2.75 AED" }, { name: "Hot & Sour Soup", price: "2.75 AED" },], 'Main Course': [{ name: "Kuttanadan Kozhi Curry", price: "6.50 AED" }, { name: "Angamaly Beef Ularthu", price: "5.00 AED" }, { name: "Fish Mango Curry", price: "5.75 AED" }, { name: "Mutton Pepper Varattu", price: "6.75 AED" }, { name: "Mushroom Masala", price: "4.00 AED" }, { name: "Ghee Rice", price: "3.25 AED" }, { name: "Chicken Fried Rice", price: "3.75 AED" },], Breads: [{ name: "Kallappam", price: "1.50 AED" }, { name: "Kerala Porotta", price: "2.00 AED" }, { name: "Chappathi", price: "1.50 AED" },], Desserts: [{ name: "Gulab Jamun", price: "3.00 AED" }, { name: "Ice Cream", price: "3.00 AED" }, { name: "Cut Fruits", price: "2.00 AED" },], }, },
  100: { title: "AED 100 Menu", itemsCount: 26, price: "100.00 AED", numericPrice: 100.00, description: "26 items for the ultimate catering experience", items: { 'Welcome Drinks': [{ name: "Passion Fruit Mojito", price: "2.25 AED" }, { name: "Honey Grape", price: "2.50 AED" },], Starters: [{ name: "Chicken Lollipop", price: "5.50 AED" }, { name: "Thai Grill Fish", price: "7.50 AED" }, { name: "Chicken Malai Tikka", price: "6.00 AED" }, { name: "Gobi 65", price: "5.25 AED" },], Salads: [{ name: "Garden Fresh Salad", price: "2.25 AED" }, { name: "Chef Special Salad", price: "2.25 AED" }, { name: "Fattoush", price: "2.50 AED" }, { name: "Grilled Chicken w/ Avocado", price: "4.00 AED" },], Soups: [{ name: "Sweet Corn Soup", price: "2.75 AED" }, { name: "Cream of Soup", price: "3.50 AED" },], 'Main Course': [{ name: "Beef Koorka Varattu", price: "6.00 AED" }, { name: "Fish Mango Curry", price: "5.75 AED" }, { name: "Mutton Pepper Varattu", price: "6.75 AED" }, { name: "Veg Kuruma / Mushroom Masala", price: "4.00 AED" }, { name: "Paneer Butter Masala", price: "3.50 AED" }, { name: "Biryani", price: "7.00 AED" }, { name: "Chicken Fried Rice / Noodles", price: "3.75 AED" }, { name: "Kappa Thalichathu", price: "3.50 AED" },], Breads: [{ name: "Kerala Porotta", price: "2.00 AED" }, { name: "Idiyappam or Kallappam", price: "1.50 AED" }, { name: "Chappathi / Wheat Porotta", price: "1.50 AED" },], Desserts: [{ name: "Gulab Jamun", price: "3.00 AED" }, { name: "Ice Cream", price: "3.00 AED" }, { name: "Cut Fruits", price: "2.00 AED" },], }, },
};

// --- MEMOIZED & REUSABLE COMPONENTS ---

const MenuPackageTabs = memo(({ selectedPackage, setSelectedPackage }) => {
  const packages = [65, 75, 85, 100];
  return (
    <div className="flex space-x-3 mb-6 overflow-x-auto pb-2">
      {packages.map(p => (
        <button key={p} onClick={() => setSelectedPackage(p)}
          className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${selectedPackage === p ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
          AED {p} Menu
        </button>
      ))}
    </div>
  );
});

const MenuItem = memo(({ name, price, isCustom, isSelected, toggleItem }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center space-x-3">
      {isCustom && (
        <input type="checkbox" checked={isSelected} onChange={() => toggleItem(name, price)}
          className="h-4 w-4 text-gray-800 bg-gray-100 border-gray-300 rounded focus:ring-gray-700 cursor-pointer"/>
      )}
      <span className={`text-gray-700 text-sm ${isSelected && isCustom ? 'font-semibold' : ''}`}>{name}</span>
    </div>
    <span className="px-2 py-0.5 text-xs font-semibold text-gray-800 bg-gray-200 rounded-md">
      {displayItemPrice(price)}
    </span>
  </div>
));

const InputField = memo(({ label, name, type = 'text', value, onChange, required = false, min, max, step, children }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children || (type === 'textarea' ? (
      <textarea id={name} name={name} rows="3" value={value} onChange={onChange} required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800 resize-none"/>
    ) : (
      <input id={name} name={name} type={type} value={value} onChange={onChange} required={required} min={min} max={max} step={step}
        className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800"/>
    ))}
  </div>
));

// NEW: Component for 24H Time Selection (in 30-minute intervals)
const TimeInput24H = memo(({ label, name, value, onChange, required = true }) => {
  // Generate times from 00:00 to 23:30 in 30-minute increments
  const TIME_OPTIONS = useMemo(() => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (const m of ['00', '30']) {
        const time = `${String(h).padStart(2, '0')}:${m}`;
        options.push(time);
      }
    }
    return options;
  }, []);

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select 
        id={name} 
        name={name} 
        value={value} 
        onChange={onChange} 
        required={required} 
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800 text-lg font-mono text-center">
        <option value="" disabled>HH:MM (24H)</option>
        {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
      </select>
    </div>
  );
});

// --- PRIMARY VIEW COMPONENTS ---

const MenuDetails = ({ data }) => (
  <div className="p-4 sm:p-6 border border-gray-200 rounded-xl bg-white shadow-lg">
    <div className="mb-6 relative text-center">
      <p className="text-xl sm:text-2xl font-extrabold text-gray-800">
          {data.description}
      </p>
    </div>
    <div className="mt-4">
      {Object.entries(data.items).map(([category, items]) => (
        <div key={category} className="mb-6">
          <h4 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-100 pb-1 mt-4">{category}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-1">
            {items.map((item, i) => <MenuItem key={i} {...item} isCustom={false} />)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MenuPackagesView = ({ selectedPackage, setSelectedPackage }) => (
  <div className="mt-6 sm:mt-8">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Select Your Menu Package</h2>
    <p className="text-sm text-gray-500 mb-4 sm:mb-6">Choose from our specially curated menu packages for your event.</p>
    <MenuPackageTabs selectedPackage={selectedPackage} setSelectedPackage={setSelectedPackage} />
    <MenuDetails data={packagesData[selectedPackage]} />
  </div>
);

const CustomizeView = ({ customItems, setCustomItems }) => {
  const totalCustomPrice = useMemo(() => Object.values(customItems).reduce((sum, item) => sum + item.price, 0), [customItems]);
  const customItemCount = useMemo(() => Object.keys(customItems).length, [customItems]); // Item Count

  const toggleItem = (name, price) => {
    setCustomItems(prev => {
      const newItems = { ...prev };
      if (newItems[name]) delete newItems[name];
      else newItems[name] = { name, price };
      return newItems;
    });
  };

  return (
    <div className="mt-6 sm:mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-end mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Customize Your Menu</h2>
          <p className="text-sm text-gray-500">Select individual items from our full selection.</p>
          {/* Added MIN PRICE MESSAGE */}
          <p className="mt-2 text-base font-semibold text-red-600">
            Minimum price to proceed: {formatAED(MIN_CUSTOM_PRICE_AED)} / pax
          </p>
        </div>
        <div className="w-full sm:w-auto text-right p-3 bg-gray-100 rounded-lg shadow-inner border border-gray-200 min-w-[150px] mt-4 sm:mt-0">
          <p className="text-sm text-gray-600 font-medium">Running Total (per pax)</p>
          {/* Display Item Count */}
          <p className="text-xl font-bold text-gray-700">{customItemCount} Items</p>
          <p className="text-2xl font-extrabold text-gray-900">{formatAED(totalCustomPrice)}</p>
        </div>
      </div>
      <div className="p-4 sm:p-6 border border-gray-200 rounded-xl bg-white shadow-lg">
        {Object.entries(masterMenuData).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h4 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-gray-100 pb-1 mt-4">{category}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-1">
              {items.map((item, i) => (
                <MenuItem key={i} {...item} isCustom={true} isSelected={!!customItems[item.name]} toggleItem={toggleItem}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- BOOKING FORM (DECOMPOSED) ---

// UPDATED initialFormState to use single time strings
const initialFormState = {
  date: '', 
  startTime: '', // 24H time string (HH:MM)
  endTime: '',   // 24H time string (HH:MM)
  name: '', number: '', email: '', eventType: '', pax: '', queries: ''
};

const DateTimeSelection = ({ formData, handleFormChange, totalHours, overtimeHours, overtimeCharge, timeError }) => {
  const { day } = formatDateAndDay(formData.date);
  // Check completion based on new single time strings
  const isTimeComplete = formData.startTime && formData.endTime; 
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-xl bg-gray-50 shadow-inner">
      {/* Responsive Date Field (Col 1 on large screens) */}
      <div className='md:col-span-1'>
        <InputField label="Event Date" name="date" type="date" value={formData.date} onChange={handleFormChange} required/>
        {day && <p className="mt-1 text-lg font-extrabold text-gray-800 text-center">{day}</p>}
      </div>
      {/* Responsive Time Fields (Col 2 on large screens) */}
      <div className="md:col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Using new TimeInput24H component */}
        <TimeInput24H label="Event Start Time (24H)" name="startTime" value={formData.startTime} onChange={handleFormChange} />
        <TimeInput24H label="Event End Time (24H)" name="endTime" value={formData.endTime} onChange={handleFormChange} />
      </div>
      
      {/* Total Duration Summary (Spanning both columns) */}
      <div className="md:col-span-2 mt-2 p-3 bg-gray-100 rounded-lg text-center shadow-md flex flex-col justify-center">
        <p className="text-sm font-light text-gray-600">Total Duration <span className="font-medium text-xs">(First {OVERTIME_LIMIT_HOURS}h Free)</span></p>
        <p className="text-2xl font-extrabold text-gray-900">
          {totalHours > 0 && isTimeComplete ? `${totalHours.toFixed(1)} hrs` : 'N/A'}
        </p>
        {timeError && <p className="text-xs text-red-500 font-medium mt-1">{timeError}</p>}
        {totalHours > OVERTIME_LIMIT_HOURS && (
          <p className="mt-1 text-xs font-semibold text-gray-800">
            +{overtimeHours}h Extratime Fee ({formatAED(overtimeCharge)})
          </p>
        )}
      </div>
    </div>
  );
};

const MenuSummary = ({ title, pricePerPax, items }) => (
  <div className="w-full md:w-1/2 p-4 border rounded-xl bg-gray-50 shadow-md">
    <h4 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2 text-center">Menu Summary</h4>
    <p className="text-md font-semibold text-gray-700 mb-2 flex justify-between">
      Selected Menu: <span className="font-extrabold text-gray-900">{title}</span>
    </p>
    <p className="text-sm text-gray-700 mb-2 flex justify-between">
      Price Per Pax: <span className="font-bold text-green-700">{formatAED(pricePerPax)}</span>
    </p>
    <div className="max-h-56 overflow-y-auto mt-3 border-t pt-2 p-2 bg-white rounded-lg shadow-inner">
      <p className="font-medium text-gray-600 text-sm mb-2 border-b pb-1">Items Included ({items.length}):</p>
      {items.map((item, index) => (
        <p key={index} className="flex justify-between text-xs text-gray-600 py-0.5">
          <span>• {item.name}</span>
          <span className="font-medium">{displayItemPrice(item.price)}</span>
        </p>
      ))}
    </div>
  </div>
);

const PricingDetails = ({ pax, handleFormChange, menuPriceTotal, overtimeCharge, finalPriceWithOvertime, requiredDeposit }) => (
  <div className="w-full md:w-1/2 p-4 border rounded-xl bg-gray-50 shadow-md flex flex-col justify-between">
    <InputField 
      label={`Total Pax (Guests - Min ${MIN_PAX}, Max ${MAX_PAX})`} // Updated label
      name="pax" 
      type="number" 
      value={pax} 
      onChange={handleFormChange} 
      required 
      min={MIN_PAX} // Added min limit
      max={MAX_PAX} // Added max limit
      step="1" 
    />
    <div className="mt-4">
      <div className="flex justify-between text-base text-gray-700 mb-2 border-b pb-2">
        <span>Menu Total ({pax || 0} Pax):</span>
        <span className="font-extrabold text-lg">{formatAED(menuPriceTotal)}</span>
      </div>
      {parseFloat(overtimeCharge) > 0 && (
        <div className="flex justify-between text-sm text-gray-800 font-medium border-b border-dashed pb-1 mb-2">
          <span>Extratime Charge:</span>
          <span className="font-bold text-gray-800">+{formatAED(overtimeCharge)}</span>
        </div>
      )}

      {/* NEW: Required Deposit Display (Percentage dynamically updates) */}
      <div className="flex justify-between text-base text-gray-800 font-bold mt-3 pt-2 border-t-2 border-gray-300">
        <span>Required Booking Deposit ({DEPOSIT_RATE * 100}%):</span>
        <span className="font-extrabold text-red-600">{formatAED(requiredDeposit)}</span>
      </div>

      <div className="mt-4 p-3 bg-gray-800 text-white rounded-lg text-center shadow-lg">
        <p className="text-sm font-light">FINAL ESTIMATED PRICE</p>
        <p className="text-4xl font-extrabold">{formatAED(finalPriceWithOvertime)}</p>
      </div>
    </div>
  </div>
);

const ClientDetails = ({ formData, handleFormChange }) => (
  <div className="p-4 border rounded-xl mb-6 shadow-md bg-white">
    <h4 className="font-bold text-gray-800 mb-3 text-lg border-b pb-2">Client Contact & Event Details:</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InputField label="Full Name" name="name" value={formData.name} onChange={handleFormChange} required />
      <InputField label="Phone Number" name="number" type="tel" value={formData.number} onChange={handleFormChange} required />
      <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleFormChange} required />
      <InputField label="Event Type (e.g., Wedding, Birthday)" name="eventType" value={formData.eventType} onChange={handleFormChange} required />
    </div>
    <InputField label="Any additional queries or special requests?" name="queries" type="textarea" value={formData.queries} onChange={handleFormChange} />
  </div>
);

const BookingFormView = ({ finalSelection, setFinalSelection }) => {
  const [formData, setFormData] = useState(() => {
    // Load persisted data, ensuring 'pax' is handled correctly if it was empty string
    const savedData = localStorage.getItem('bookingFormData');
    const data = savedData ? JSON.parse(savedData) : initialFormState;
    // Ensure pax is not null/undefined if loading old data
    return { ...initialFormState, ...data, pax: data.pax === null || data.pax === undefined ? '' : String(data.pax) };
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeError, setTimeError] = useState('');

  // Persist form data to localStorage
  useEffect(() => {
    localStorage.setItem('bookingFormData', JSON.stringify(formData));
  }, [formData]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // --- Calculations ---
  const startTime24 = useMemo(() => formData.startTime, [formData.startTime]);
  const endTime24 = useMemo(() => formData.endTime, [formData.endTime]);
  const totalHours = useMemo(() => calculateTotalHours(startTime24, endTime24), [startTime24, endTime24]);

  // Enhanced validation effect for time
  useEffect(() => {
    if (startTime24 && endTime24 && totalHours <= 0) { 
      setTimeError('End time must be after start time (or after midnight).');
    } else {
      setTimeError('');
    }
  }, [startTime24, endTime24, totalHours]);
  
  // Updated Calculation to include Deposit
  const { menuPriceTotal, overtimeHours, overtimeCharge, finalPriceWithOvertime, requiredDeposit } = useMemo(() => {
    const pax = parseInt(formData.pax, 10) || 0;
    const menuTotal = finalSelection.basePrice * pax;
    let otHours = 0;
    let otCharge = 0;
    
    if (totalHours > OVERTIME_LIMIT_HOURS) {
      otHours = totalHours - OVERTIME_LIMIT_HOURS;
      otCharge = otHours * OVERTIME_RATE_AED;
    }
    
    const finalTotal = menuTotal + otCharge;
    const deposit = finalTotal * DEPOSIT_RATE;

    return {
      menuPriceTotal: menuTotal,
      overtimeHours: otHours.toFixed(1),
      overtimeCharge: otCharge,
      finalPriceWithOvertime: finalTotal,
      requiredDeposit: deposit // Returning the calculated deposit
    };
  }, [formData.pax, finalSelection.basePrice, totalHours]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (timeError || !e.currentTarget.checkValidity()) {
        e.currentTarget.reportValidity();
        return;
    }

    const paxCount = parseInt(formData.pax, 10);
    
    // NEW PAX VALIDATION AND FEEDBACK
    let paxError = null;
    if (isNaN(paxCount) || paxCount <= 0) {
        paxError = "Please enter a valid number of guests (Pax).";
    } else if (paxCount < MIN_PAX) {
        paxError = `Minimum guests required is ${MIN_PAX} Pax.`;
    } else if (paxCount > MAX_PAX) {
        paxError = `Maximum hall capacity is ${MAX_PAX} Pax.`;
    }

    if (paxError) {
        // Use custom message display for feedback
        const messageDisplay = document.getElementById('floating-message');
        messageDisplay.textContent = paxError;
        messageDisplay.classList.remove('hidden', 'bg-yellow-500');
        messageDisplay.classList.add('bg-red-600');
        setTimeout(() => messageDisplay.classList.add('hidden'), 4000);
        return;
    }

    // --- Submission Logic (Generating WhatsApp Link) ---
    
    const { full: fullDate } = formatDateAndDay(formData.date);
    const { menuTitle, itemsToDisplay } = {
        isCustom: finalSelection.type === 'custom',
        menuTitle: finalSelection.type === 'custom' ? 'Custom Menu' : packagesData[finalSelection.value].title,
        itemsToDisplay: finalSelection.type === 'custom' ? finalSelection.items : flattenItems(packagesData[finalSelection.value].items)
    };
    const itemsList = itemsToDisplay.map(item => `- ${item.name} (${displayItemPrice(item.price)})`).join('\n');

    // Construct the WhatsApp message body with cleaner formatting
    const whatsappBody = 
        `*⭐ NEW BOOKING: DHE SWAGAT RESTAURANT ⭐*\n\n` +
        
        `*--- 👤 CLIENT DETAILS ---*\n` +
        `*Name:* ${formData.name}\n` +
        `*Phone:* ${formData.number}\n` +
        `*Email:* ${formData.email}\n` +
        `*Event Type:* ${formData.eventType}\n\n` +
        
        `*--- 🗓️ EVENT TIMING ---*\n` +
        `*Date:* ${fullDate}\n` +
        `*Duration:* ${totalHours.toFixed(1)} hours (Start: ${formData.startTime} | End: ${formData.endTime})\n\n` +
        
        `*--- 🍽️ MENU SELECTION ---*\n` +
        `*Menu:* ${menuTitle}\n` +
        `*Guests (Pax):* ${formData.pax}\n` +
        `*Price Per Pax:* ${formatAED(finalSelection.basePrice)}\n` +
        `*Items Selected (${itemsToDisplay.length}):*\n` +
        `${itemsList}\n\n` +
        
        `*--- 💰 FINAL QUOTE ---*\n` +
        `*Menu Subtotal:* ${formatAED(menuPriceTotal)}\n` +
        (overtimeCharge > 0 ? `*Extratime Charge (${overtimeHours}h):* +${formatAED(overtimeCharge)}\n` : '') +
        `*Required Deposit (${DEPOSIT_RATE * 100}%):* ${formatAED(requiredDeposit)}\n` + // Deposit updated
        `*TOTAL ESTIMATE:* ${formatAED(finalPriceWithOvertime)}\n\n` +
        
        `*--- ❓ QUERIES ---*\n` +
        `${formData.queries || 'None'}`;
      
    // Encode the entire body for the URL and open WhatsApp
    const whatsappUrl = `https://wa.me/${RECIPIENT_WHATSAPP}?text=${encodeURIComponent(whatsappBody)}`;
      
    window.open(whatsappUrl, '_blank');
    setIsSubmitted(true);
  };
  
  if (!finalSelection || finalSelection.type === null) {
    return (
      <div className="mt-8 p-10 border border-red-200 rounded-xl bg-red-50 shadow-lg h-96 flex items-center justify-center">
        <p className="text-xl text-red-700 font-semibold text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.398 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Please select a menu package or customize your menu in the previous steps to proceed.
        </p>
      </div>
    );
  }

  const { isCustom, menuTitle, itemsToDisplay } = useMemo(() => {
    return {
      isCustom: finalSelection.type === 'custom',
      menuTitle: finalSelection.type === 'custom' ? 'Custom Menu' : packagesData[finalSelection.value].title,
      itemsToDisplay: finalSelection.type === 'custom' ? finalSelection.items : flattenItems(packagesData[finalSelection.value].items)
    };
  }, [finalSelection]);

  if (isSubmitted) {
    return (
      <div className="mt-8 p-10 border border-green-200 rounded-xl bg-green-50 shadow-lg flex flex-col items-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2m4-4l-4 4m0-4v-1a4 4 0 10-8 0v1m0 4h.01m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-3xl font-extrabold text-green-700 mb-4">Request Generated!</h2>
        <p className="text-xl text-gray-800">Your booking request has been drafted in **WhatsApp**.</p>
        <p className="mt-4 text-lg text-gray-700 font-semibold max-w-lg">
          <span className="font-extrabold text-red-500 block mb-2">CRITICAL STEP:</span>
          Please **send the generated WhatsApp message** to officially complete your submission and receive a confirmation call.
        </p>
        <p className="text-lg text-gray-700 mt-2 p-2 bg-green-100 rounded-lg">Estimated Total: <strong>{formatAED(finalPriceWithOvertime)}</strong></p>
        <button
          onClick={() => {
            setIsSubmitted(false);
            setFormData(initialFormState);
            localStorage.removeItem('bookingFormData');
            setFinalSelection({ type: null }); // Reset selection
          }}
          className="mt-6 px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-lg hover:bg-gray-700 transition"
        >
          Start New Booking
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 p-4 sm:p-10 border rounded-xl bg-white shadow-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center border-b pb-3">Finalize Your Booking</h2>
      <DateTimeSelection formData={formData} handleFormChange={handleFormChange} totalHours={totalHours} overtimeHours={overtimeHours} overtimeCharge={overtimeCharge} timeError={timeError} />
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        {/* Passed requiredDeposit to PricingDetails */}
        <MenuSummary title={menuTitle} pricePerPax={finalSelection.basePrice} items={itemsToDisplay} />
        <PricingDetails pax={formData.pax} handleFormChange={handleFormChange} menuPriceTotal={menuPriceTotal} overtimeCharge={overtimeCharge} finalPriceWithOvertime={finalPriceWithOvertime} requiredDeposit={requiredDeposit} />
      </div>
      <ClientDetails formData={formData} handleFormChange={handleFormChange} />
      <div className="flex justify-center">
        <button type="submit" disabled={timeError}
          className="w-full max-w-sm px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg shadow-xl hover:bg-gray-700 transition transform hover:scale-[1.01] disabled:bg-red-500 disabled:cursor-not-allowed disabled:shadow-none">
          Submit Request via WhatsApp ({formatAED(finalPriceWithOvertime)})
        </button>
      </div>
      
    </form>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedPackage, setSelectedPackage] = useState(65);
  const [customItems, setCustomItems] = useState({});
  const [finalSelection, setFinalSelection] = useState({ type: null });

  // Scroll to top on tab change for better UX
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const totalCustomPrice = useMemo(() => Object.values(customItems).reduce((sum, item) => sum + item.price, 0), [customItems]);

  const handleContinueToBooking = () => {
    let selection;
    if (activeTab === 'customize') {
      const itemCount = Object.keys(customItems).length;

      if (itemCount === 0) {
        // Warning if no items are selected
        const messageDisplay = document.getElementById('floating-message');
        messageDisplay.textContent = 'Please select at least one item to proceed with a custom menu.';
        messageDisplay.classList.remove('hidden');
        messageDisplay.classList.remove('bg-red-600');
        messageDisplay.classList.add('bg-yellow-500');
        setTimeout(() => messageDisplay.classList.add('hidden'), 3000);
        return;
      }

      // Check for Minimum Price Requirement
      if (totalCustomPrice < MIN_CUSTOM_PRICE_AED) {
          const messageDisplay = document.getElementById('floating-message');
          messageDisplay.textContent = `Minimum custom menu price must be ${formatAED(MIN_CUSTOM_PRICE_AED)} to proceed.`;
          messageDisplay.classList.remove('hidden');
          messageDisplay.classList.remove('bg-yellow-500');
          messageDisplay.classList.add('bg-red-600');
          setTimeout(() => messageDisplay.classList.add('hidden'), 4000);
          return;
      }

      selection = { type: 'custom', basePrice: totalCustomPrice, items: Object.values(customItems) };
    } else {
      const pkg = packagesData[selectedPackage];
      selection = { type: 'package', value: selectedPackage, basePrice: pkg.numericPrice, items: pkg.items };
    }
    setFinalSelection(selection);
    setActiveTab('booking');
  };

  const isCustomDisabled = activeTab === 'customize' && (totalCustomPrice < MIN_CUSTOM_PRICE_AED);


  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col items-center">
      {/* Tailwind and Font Setup (Inline for Single File Mandate) */}
      <script src="https://cdn.tailwindcss.com"></script>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>
      
      <header className="w-full">
        <div className="text-center mb-6 pt-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Dhe Swagat Restaurant</h1>
          <p className="text-base sm:text-xl text-gray-600 mt-1">Party Hall Menu Booking</p>
        </div>
        <nav className="flex border-b border-gray-200 w-full max-w-4xl mx-auto">
          {['Menu Packages', 'Customize Menu', 'Book Now'].map((label, i) => {
            const tabKey = ['menu', 'customize', 'booking'][i];
            return (
              <button key={tabKey} onClick={() => setActiveTab(tabKey)}
                className={`flex-1 py-3 text-center text-sm sm:text-lg font-medium transition-colors ${activeTab === tabKey ? 'border-b-4 border-gray-800 text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="w-full max-w-4xl p-3 sm:p-6 bg-white shadow-xl rounded-xl mt-4 mb-24">
        {activeTab === 'menu' && <MenuPackagesView selectedPackage={selectedPackage} setSelectedPackage={setSelectedPackage} />}
        {activeTab === 'customize' && <CustomizeView customItems={customItems} setCustomItems={setCustomItems} />}
        {activeTab === 'booking' && <BookingFormView finalSelection={finalSelection} setFinalSelection={setFinalSelection} />}
      </main>

      {/* Floating Message Box (for non-alert feedback) */}
      <div id="floating-message" className="hidden fixed top-2 right-2 p-3 bg-red-600 text-white rounded-lg shadow-xl transition-opacity duration-300 opacity-95 z-50">
        Placeholder Message
      </div>

      {/* Fixed Footer for Navigation */}
      {(activeTab === 'menu' || activeTab === 'customize') && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-4 border-gray-800 shadow-2xl flex justify-center z-10">
          <button onClick={handleContinueToBooking} 
            disabled={isCustomDisabled}
            className="w-full max-w-xs px-6 py-3 font-semibold rounded-lg shadow-lg transition bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:shadow-none">
            Continue to Booking 
            {activeTab === 'customize' && totalCustomPrice > 0 && ` (${formatAED(totalCustomPrice)})`}
          </button>
        </footer>
      )}
    </div>
  );
}
