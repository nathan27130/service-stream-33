import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface WeeklyPlanningProps {
  orders: any[];
  services: any[];
  weekDate: Date;
  serviceId?: string; // If specified, show only this service
}

const WeeklyPlanning = ({ orders, services, weekDate, serviceId }: WeeklyPlanningProps) => {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const filteredServices = serviceId
    ? services.filter(s => s.id === serviceId)
    : services;

  const getOrdersForServiceAndDay = (serviceId: string, day: Date) => {
    return orders.filter(order => {
      const orderDate = new Date(order.due_at);
      return (
        order.service_id === serviceId &&
        orderDate.toDateString() === day.toDateString()
      );
    }).sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  };

  return (
    <div className="print-only max-w-[210mm] mx-auto p-8 bg-white text-black">
      <style>
        {`
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            @page { size: A4 landscape; margin: 10mm; }
          }
          @media screen {
            .print-only { display: none; }
          }
        `}
      </style>

      {/* Header */}
      <div className="mb-6 pb-3 border-b-2 border-black">
        <h1 className="text-2xl font-bold">
          {serviceId ? `Planning ${filteredServices[0]?.name}` : "Planning Global"}
        </h1>
        <p className="text-sm mt-1">
          Semaine du {format(weekStart, "d MMMM", { locale: fr })} au{" "}
          {format(weekEnd, "d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Planning Grid */}
      {filteredServices.map((service) => (
        <div key={service.id} className="mb-8 break-inside-avoid">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: service.color }}
            />
            <h2 className="text-lg font-bold">{service.name}</h2>
          </div>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                {daysOfWeek.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="border border-gray-300 p-2 text-center w-[14.28%]"
                  >
                    <div className="font-bold">
                      {format(day, "EEE", { locale: fr })}
                    </div>
                    <div className="text-lg">{format(day, "d", { locale: fr })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {daysOfWeek.map((day) => {
                  const dayOrders = getOrdersForServiceAndDay(service.id, day);
                  return (
                    <td
                      key={day.toISOString()}
                      className="border border-gray-300 p-2 align-top"
                      style={{ minHeight: "120px" }}
                    >
                      {dayOrders.length === 0 ? (
                        <div className="text-gray-400 text-center py-4">-</div>
                      ) : (
                        <div className="space-y-2">
                          {dayOrders.map((order) => (
                            <div
                              key={order.id}
                              className="border-l-2 pl-2 py-1"
                              style={{ borderColor: service.color }}
                            >
                              <div className="font-semibold text-xs">
                                {format(new Date(order.due_at), "HH:mm")}
                              </div>
                              <div className="text-xs">
                                {order.customers?.name || "Sans client"}
                              </div>
                              <div className="text-xs text-gray-600">
                                {order.type}
                              </div>
                              {order.priority === "haute" && (
                                <span className="text-xs font-bold text-red-600">!</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          {/* Summary */}
          <div className="mt-2 text-xs text-gray-600">
            Total commandes: {orders.filter(o => o.service_id === service.id).length}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="mt-6 pt-3 border-t border-gray-300 text-xs text-gray-600">
        <p>Document généré le {format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</p>
      </div>
    </div>
  );
};

export default WeeklyPlanning;
