export type DemoPerson = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  managerId: string | null;
  hint: string;
};

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: "demo-alex",
    name: "Alex Morgan",
    email: "alex.morgan@ttecdigital.com",
    jobTitle: "Director, IT",
    department: "IT",
    managerId: null,
    hint: "Start here for the approval inbox. Jordan and Sam report to Alex. Sam's team routes to Sam.",
  },
  {
    id: "demo-sam",
    name: "Sam Patel",
    email: "sam.patel@ttecdigital.com",
    jobTitle: "IT Supervisor",
    department: "IT",
    managerId: "demo-alex",
    hint: "Supervises Riley and Casey. Their requests wait on Sam, not Alex.",
  },
  {
    id: "demo-jordan",
    name: "Jordan Lee",
    email: "jordan.lee@ttecdigital.com",
    jobTitle: "IT Analyst",
    department: "IT",
    managerId: "demo-alex",
    hint: "Reports to Alex. Has a sick day waiting on Alex and an older approved PTO.",
  },
  {
    id: "demo-riley",
    name: "Riley Nguyen",
    email: "riley.nguyen@ttecdigital.com",
    jobTitle: "Support Specialist",
    department: "IT",
    managerId: "demo-sam",
    hint: "Reports to Sam. Approved sick time is already on the books, plus upcoming PTO.",
  },
  {
    id: "demo-casey",
    name: "Casey Brooks",
    email: "casey.brooks@ttecdigital.com",
    jobTitle: "Support Specialist",
    department: "IT",
    managerId: "demo-sam",
    hint: "Reports to Sam. A PTO request for a wedding is waiting on Sam.",
  },
];

export function demoPerson(id: string): DemoPerson | undefined {
  return DEMO_PEOPLE.find((person) => person.id === id);
}

export function demoManager(person: DemoPerson): DemoPerson | null {
  if (!person.managerId) return null;
  return demoPerson(person.managerId) ?? null;
}
