import Link from "next/link";

const consoles = [
  {
    href: "/reception",
    title: "Reception",
    desc: "Register patients — name, consultant, room, auto timestamp",
    color: "border-emerald-200 hover:border-emerald-400 bg-emerald-50",
  },
  {
    href: "/doctor",
    title: "Doctor Console",
    desc: "Call, consult, send to lab / radiology / pharmacy",
    color: "border-blue-200 hover:border-blue-400 bg-blue-50",
  },
  {
    href: "/lab",
    title: "Laboratory",
    desc: "Receive patients, set report ETA, send back to doctor",
    color: "border-purple-200 hover:border-purple-400 bg-purple-50",
  },
  {
    href: "/radiology",
    title: "Radiology",
    desc: "Receive patients, set report ETA, send back to doctor",
    color: "border-indigo-200 hover:border-indigo-400 bg-indigo-50",
  },
  {
    href: "/pharmacy",
    title: "Pharmacy",
    desc: "Dispense medicines and mark patient exit",
    color: "border-teal-200 hover:border-teal-400 bg-teal-50",
  },
  {
    href: "/tv",
    title: "TV Display",
    desc: "Waiting room screen — calls, directions, report ETAs",
    color: "border-rose-200 hover:border-rose-400 bg-rose-50",
  },
  {
    href: "/manager",
    title: "OPD Manager",
    desc: "Full clinic overview — every patient from entry to exit",
    color: "border-slate-300 hover:border-slate-500 bg-slate-50",
  },
  {
    href: "/analytics",
    title: "Analytics",
    desc: "Patients, doctors, lab, radiology, turnaround time & OPD prediction",
    color: "border-indigo-300 hover:border-indigo-500 bg-indigo-50",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 text-center text-white">
          <h1 className="text-4xl font-bold tracking-tight">OPD Manager</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-300">
            Guide every patient from reception to exit — doctor, lab, radiology,
            pharmacy, and live TV updates. Free cloud deployment on Vercel +
            Neon.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {consoles.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`rounded-2xl border-2 p-6 transition shadow-lg ${c.color}`}
            >
              <h2 className="text-xl font-bold text-slate-900">{c.title}</h2>
              <p className="mt-2 text-slate-700">{c.desc}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          Open each console on its dedicated PC, tablet, or TV browser tab.
        </p>
      </div>
    </div>
  );
}
