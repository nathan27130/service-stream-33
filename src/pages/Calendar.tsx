import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import CalendarWeekView from "@/components/calendar/CalendarWeekView";
import CalendarActions from "@/components/calendar/CalendarActions";
import { useAuth } from "@/contexts/AuthContext";

const Calendar = () => {
  const { serviceId, hasRole } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");

  useEffect(() => {
    loadServices();
  }, [serviceId]);

  const loadServices = async () => {
    let query = supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("name");

    // Filter by service if service role
    if (hasRole("service") && serviceId) {
      query = query.eq("id", serviceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading services:", error);
      return;
    }

    if (data && data.length > 0) {
      setServices(data);
      setSelectedService(data[0].id);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground mt-2">
              Visualisez et gérez vos commandes par service
            </p>
          </div>
          <Button onClick={goToToday} className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Aujourd'hui
          </Button>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Aucun service actif disponible
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={selectedService} onValueChange={setSelectedService} className="space-y-4">
            {/* Service tabs */}
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              {services.map((service) => (
                <TabsTrigger key={service.id} value={service.id} className="gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  {service.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* View tabs (Day/Week) */}
            <div className="flex justify-end">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <Button
                  variant={view === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("day")}
                  className="rounded-sm px-3"
                >
                  Jour
                </Button>
                <Button
                  variant={view === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("week")}
                  className="rounded-sm px-3"
                >
                  Semaine
                </Button>
              </div>
            </div>

            {/* Calendar views */}
            {services.map((service) => (
              <TabsContent key={service.id} value={service.id} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: service.color }}
                        />
                        Agenda {service.name}
                      </CardTitle>
                      <CalendarActions
                        serviceId={service.id}
                        serviceName={service.name}
                        selectedDate={selectedDate}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {view === "day" ? (
                      <CalendarDayView
                        serviceId={service.id}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                      />
                    ) : (
                      <CalendarWeekView
                        serviceId={service.id}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default Calendar;
