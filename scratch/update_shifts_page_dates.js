const fs = require('fs');
let content = fs.readFileSync('src/components/ShiftsPage.tsx', 'utf8');

// 1. Remove const dates
content = content.replace(/const dates = \["10\/jul", "11\/jul", "12\/jul"\] as const;\n/, '');
content = content.replace(/type DateKey = typeof dates\[number\];\n/, '');

// 2. Add state
const stateAdd = `const [dates, setDates] = useState<string[]>([]);`;
content = content.replace(/const \[loading, setLoading\] = useState\(true\);\n/, `const [loading, setLoading] = useState(true);\n  ${stateAdd}\n`);

// 3. Update useEffect fetchVigias to also recalculate dates
const fetchVigiasOld = `const locs: Record<string, AbstractLocation> = {};
      snap.docs.forEach(d => {
        locs[d.id] = { id: d.id, ...d.data() } as AbstractLocation;
      });
      currentLocs = locs;
      setLocations(locs);
      fetchVigias();`;
const fetchVigiasNew = `const locs: Record<string, AbstractLocation> = {};
      snap.docs.forEach(d => {
        locs[d.id] = { id: d.id, ...d.data() } as AbstractLocation;
      });
      currentLocs = locs;
      setLocations(locs);
      
      const uniqueDates = new Set<string>();
      Object.values(locs).forEach(loc => {
        if (loc.customShifts) {
          Object.keys(loc.customShifts).forEach(d => uniqueDates.add(d));
        }
      });
      // Sort dates chronologically: if it's YYYY-MM-DD they sort naturally, else parse
      const sortedDates = Array.from(uniqueDates).sort((a, b) => {
        const parseDate = (ds: string) => {
          if (ds.includes("-")) return new Date(ds).getTime();
          const mMap: any = {"jan":0,"fev":1,"mar":2,"abr":3,"mai":4,"jun":5,"jul":6,"ago":7,"set":8,"out":9,"nov":10,"dez":11};
          const parts = ds.split("/");
          if (parts.length === 2 && mMap[parts[1]] !== undefined) {
            return new Date(2026, mMap[parts[1]], parseInt(parts[0])).getTime();
          }
          return 0;
        };
        return parseDate(a) - parseDate(b);
      });
      setDates(sortedDates);
      
      fetchVigias();`;
content = content.replace(fetchVigiasOld, fetchVigiasNew);

// 4. Update assignVigia
const assignVigiaOld = `let isoStart = new Date().toISOString();
      if (date === "10/jul") isoStart = \`2026-07-10T\${shiftTimes.start}:00Z\`;
      if (date === "11/jul") isoStart = \`2026-07-11T\${shiftTimes.start}:00Z\`;
      if (date === "12/jul") isoStart = \`2026-07-12T\${shiftTimes.start}:00Z\`;`;
const assignVigiaNew = `let isoStart = new Date().toISOString();
      if (date.includes("-")) {
        isoStart = \`\${date}T\${shiftTimes.start}:00Z\`;
      } else {
        const mMap: any = {"jan":"01","fev":"02","mar":"03","abr":"04","mai":"05","jun":"06","jul":"07","ago":"08","set":"09","out":"10","nov":"11","dez":"12"};
        const parts = date.split("/");
        if (parts.length === 2 && mMap[parts[1]]) {
           isoStart = \`2026-\${mMap[parts[1]]}-\${parts[0].padStart(2, '0')}T\${shiftTimes.start}:00Z\`;
        }
      }`;
content = content.replace(assignVigiaOld, assignVigiaNew);

fs.writeFileSync('src/components/ShiftsPage.tsx', content);
console.log("Updated ShiftsPage.tsx");
