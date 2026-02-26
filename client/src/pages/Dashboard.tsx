import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, differenceInMonths, parseISO } from "date-fns";
import { Users, UserPlus, Settings, PieChart, Calendar, ChevronRight, TrendingUp, AlertCircle, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Classroom, Child } from "@shared/schema";

const getClassroomForChild = (child: Child, targetDate: Date, classrooms: Classroom[]): number | null => {
  const ageInMonths = differenceInMonths(targetDate, parseISO(child.birthDate));
  const classroom = classrooms.find(
    c => ageInMonths >= c.minAgeMonths && ageInMonths < c.maxAgeMonths
  );
  return classroom ? classroom.id : null;
};

const getChildAgeInMonths = (birthDate: string, targetDate: Date): number => {
  return differenceInMonths(targetDate, parseISO(birthDate));
};

const formatAgeInMonths = (totalMonths: number): string => {
  if (totalMonths < 12) return `${totalMonths} mos`;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years} year${years > 1 ? 's' : ''} + ${months} mos`;
};

export default function Dashboard() {
  const { data: classrooms = [], isLoading: classroomsLoading } = useQuery<Classroom[]>({
    queryKey: ["/api/classrooms"],
  });
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });
  const [forecastMonths, setForecastMonths] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  
  const today = new Date();
  const forecastDate = addMonths(today, forecastMonths);
  
  const isLoading = classroomsLoading || childrenLoading;

  const forecastStats = useMemo(() => {
    const stats: Record<number, { enrolled: Child[], graduatingSoon: Child[], graduatingNextMonth: number }> = {};
    
    classrooms.forEach(c => {
      stats[c.id] = { enrolled: [], graduatingSoon: [], graduatingNextMonth: 0 };
    });
    
    children.forEach(child => {
      const classId = getClassroomForChild(child, forecastDate, classrooms);
      if (classId !== null && stats[classId]) {
        stats[classId].enrolled.push(child);
        
        const ageNow = getChildAgeInMonths(child.birthDate, forecastDate);
        const classroom = classrooms.find(c => c.id === classId);
        
        if (classroom && (classroom.maxAgeMonths - ageNow) <= 3) {
          stats[classId].graduatingSoon.push(child);
          if ((classroom.maxAgeMonths - ageNow) <= 1) {
            stats[classId].graduatingNextMonth++;
          }
        }
      }
    });
    
    Object.keys(stats).forEach(classId => {
      stats[Number(classId)].enrolled.sort((a, b) => {
        return getChildAgeInMonths(b.birthDate, forecastDate) - getChildAgeInMonths(a.birthDate, forecastDate);
      });
    });
    
    return stats;
  }, [children, classrooms, forecastDate]);

  const trendData = useMemo(() => {
    const data: Record<number, { month: string, enrolled: number, capacity: number, isForecast: boolean }[]> = {};
    
    classrooms.forEach(c => {
      data[c.id] = [];
    });
    
    for (let m = -12; m <= 12; m++) {
      const targetDate = addMonths(forecastDate, m);
      const monthLabel = format(targetDate, "MMM yy");
      
      const monthStats: Record<number, number> = {};
      classrooms.forEach(c => { monthStats[c.id] = 0; });
      
      children.forEach(child => {
        const classId = getClassroomForChild(child, targetDate, classrooms);
        if (classId !== null) {
          monthStats[classId]++;
        }
      });
      
      classrooms.forEach(c => {
        data[c.id].push({
          month: monthLabel,
          enrolled: monthStats[c.id],
          capacity: c.capacity,
          isForecast: m > 0
        });
      });
    }
    
    return data;
  }, [children, classrooms, forecastDate]);

  // Overall totals
  const totalCapacity = classrooms.reduce((sum, c) => sum + c.capacity, 0);
  const totalEnrolled = Object.values(forecastStats).reduce((sum, s) => sum + s.enrolled.length, 0);
  const totalVacancies = totalCapacity - totalEnrolled;

  const capacityInsights = useMemo(() => {
    const insights: { type: 'critical' | 'warning' | 'opportunity', message: string, classroomId: number }[] = [];
    
    classrooms.forEach(c => {
      if (!forecastStats[c.id]) return;
      const enrolled = forecastStats[c.id].enrolled.length;
      const ratio = enrolled / c.capacity;
      const vacancies = c.capacity - enrolled;
      
      if (ratio > 1) {
        insights.push({
          type: 'critical',
          message: `${c.name} is over capacity by ${Math.abs(vacancies)} spot${Math.abs(vacancies) !== 1 ? 's' : ''}.`,
          classroomId: c.id
        });
      } else if (ratio >= 0.9) {
        insights.push({
          type: 'warning',
          message: `${c.name} is nearing capacity (${vacancies} spot${vacancies !== 1 ? 's' : ''} left).`,
          classroomId: c.id
        });
      } else if (ratio <= 0.6) {
        insights.push({
          type: 'opportunity',
          message: `${c.name} has high availability (${vacancies} vacancies). Consider marketing.`,
          classroomId: c.id
        });
      }
    });
    
    return insights;
  }, [forecastStats, classrooms]);

  const totalCapacityPercentage = Math.round((totalEnrolled / totalCapacity) * 100);

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const ratio = enrolled / capacity;
    if (ratio > 1) return "text-destructive font-bold"; // Over capacity!
    if (ratio >= 0.9) return "text-orange-500 font-medium"; // Near capacity
    if (ratio <= 0.5) return "text-primary font-medium"; // Lots of space
    return "text-muted-foreground"; // Normal
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Navbar */}
      <header className="sticky top-0 z-40 glass-panel border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <div className="bg-primary/10 p-2 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">LittleSteps<span className="text-foreground">Forecaster</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search children..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-full gap-2">
            <Settings size={16} />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Top Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="glass-panel border-transparent shadow-sm md:col-span-1">
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
              <div className="flex items-start justify-between w-full">
                <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
                <div className="p-2 bg-primary/5 text-primary rounded-full shrink-0">
                  <Users size={16} />
                </div>
              </div>
              <div className="flex items-end justify-between w-full mt-4">
                <div className="flex items-baseline gap-1.5">
                  <h2 className="text-3xl font-serif font-bold leading-none">{totalEnrolled}</h2>
                  <span className="text-sm text-muted-foreground">/ {totalCapacity}</span>
                </div>
                <div className={`text-3xl font-serif font-bold leading-none ${totalCapacityPercentage >= 95 ? 'text-destructive' : totalCapacityPercentage >= 85 ? 'text-orange-500' : 'text-primary'}`}>
                  {totalCapacityPercentage}%
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-transparent shadow-sm md:col-span-1">
            <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
              <div className="flex items-start justify-between w-full">
                <p className="text-sm font-medium text-muted-foreground">Total Vacancies</p>
                <div className="p-2 bg-emerald-500/5 text-emerald-600 rounded-full shrink-0">
                  <PieChart size={16} />
                </div>
              </div>
              <div className="flex items-end justify-between w-full mt-4">
                <div className="flex items-baseline gap-1.5">
                  <h2 className="text-3xl font-serif font-bold text-emerald-600 leading-none">{totalVacancies}</h2>
                  <span className="text-sm text-muted-foreground">spots</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-transparent shadow-sm md:col-span-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-4 h-full flex flex-col justify-center">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Calendar size={18} />
                  <h3 className="font-semibold text-sm">Time Machine Forecasting</h3>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif font-bold text-primary leading-none block">
                    {format(forecastDate, "MMM yyyy")}
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecastMonths === 0 ? "Current Month" : forecastMonths > 0 ? `${forecastMonths}mo future` : `${Math.abs(forecastMonths)}mo past`}
                  </p>
                </div>
              </div>
              
              <div className="px-2">
                <Slider 
                  data-testid="slider-forecast"
                  defaultValue={[0]} 
                  min={-12}
                  max={24} 
                  step={1}
                  value={[forecastMonths]}
                  onValueChange={(val) => setForecastMonths(val[0])}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
                  <span>-12m</span>
                  <span>Now</span>
                  <span>+12m</span>
                  <span>+24m</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* The Pipeline Visualization */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold tracking-tight">Enrollment Pipeline</h2>
            <Button size="sm" variant="ghost" className="rounded-full">
              <UserPlus size={16} className="mr-2" />
              Add Child
            </Button>
          </div>
          
          <div className="relative">
            {/* The horizontal track that connects the classrooms */}
            <div className="absolute top-[80px] left-10 right-10 h-1 bg-border rounded-full z-0 hidden lg:block" />
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
              {classrooms.map((classroom, index) => {
                const stats = forecastStats[classroom.id] || { enrolled: [], graduatingSoon: [], graduatingNextMonth: 0 };
                const enrolledCount = stats.enrolled.length;
                const capacityRatio = enrolledCount / classroom.capacity;
                const isOverCapacity = enrolledCount > classroom.capacity;
                
                return (
                  <motion.div 
                    layout
                    key={classroom.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Arrow connecting to next classroom */}
                    {index < classrooms.length - 1 && (
                      <div className="absolute top-[70px] -right-5 z-20 hidden lg:flex items-center justify-center bg-background border shadow-sm rounded-full w-8 h-8 text-muted-foreground">
                        <ChevronRight size={16} />
                      </div>
                    )}

                    {/* Classroom Header Card */}
                    <Card className={`overflow-hidden border-2 transition-all duration-300 ${isOverCapacity ? 'border-destructive shadow-destructive/10' : 'border-transparent hover:border-primary/20'}`}>
                      <div className={`h-2 w-full ${classroom.color.split(' ')[0]}`} />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg font-serif">{classroom.name}</CardTitle>
                            <CardDescription className="text-xs">{classroom.minAgeMonths}-{classroom.maxAgeMonths} mos &bull; Ratio {classroom.ratio}</CardDescription>
                          </div>
                          <Badge variant="outline" className={`font-mono font-bold ${getCapacityColor(enrolledCount, classroom.capacity)}`}>
                            {enrolledCount}/{classroom.capacity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        {/* Capacity Bar */}
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2">
                          <motion.div 
                            className={`h-full rounded-full ${isOverCapacity ? 'bg-destructive' : capacityRatio > 0.8 ? 'bg-orange-400' : 'bg-primary'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(capacityRatio * 100, 100)}%` }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                          />
                        </div>
                        
                        {/* Status Messages */}
                        <div className="min-h-[24px] text-xs">
                          {isOverCapacity ? (
                            <span className="flex items-center text-destructive font-medium">
                              <AlertCircle size={12} className="mr-1" />
                              Over capacity by {enrolledCount - classroom.capacity}
                            </span>
                          ) : classroom.capacity - enrolledCount <= 2 ? (
                            <span className="text-orange-500 font-medium">
                              Only {classroom.capacity - enrolledCount} spot{classroom.capacity - enrolledCount !== 1 ? 's' : ''} left
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {classroom.capacity - enrolledCount} vacancies available
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Classroom Specific Insight */}
                    {(() => {
                      const classroomInsights = capacityInsights.filter(insight => insight.classroomId === classroom.id);
                      
                      if (classroomInsights.length === 0) {
                        return (
                          <div className="min-h-[60px]">
                            <Card className="shadow-none border-transparent bg-transparent h-full">
                              <CardContent className="p-3" />
                            </Card>
                          </div>
                        );
                      }

                      return classroomInsights.map((insight, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="min-h-[60px]"
                        >
                          <Card className={`shadow-sm border-l-4 border-t-0 border-r-0 border-b-0 h-full ${
                            insight.type === 'critical' ? 'border-l-destructive bg-destructive/5' :
                            insight.type === 'warning' ? 'border-l-orange-500 bg-orange-500/5' :
                            'border-l-primary bg-primary/5'
                          }`}>
                            <CardContent className="p-3 flex items-start gap-2">
                              <div className="mt-0.5 shrink-0">
                                {insight.type === 'critical' && <AlertCircle size={14} className="text-destructive" />}
                                {insight.type === 'warning' && <AlertCircle size={14} className="text-orange-500" />}
                                {insight.type === 'opportunity' && <TrendingUp size={14} className="text-primary" />}
                              </div>
                              <p className={`text-xs font-medium leading-tight ${
                                insight.type === 'critical' ? 'text-destructive' :
                                insight.type === 'warning' ? 'text-orange-600' :
                                'text-primary'
                              }`}>
                                {insight.message}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ));
                    })()}

                    {/* Trend Chart */}
                    <Card className="shadow-sm border-transparent glass-panel overflow-hidden h-32 relative shrink-0">
                      <div className="absolute top-2 left-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider z-10">
                        Trend (±12mo)
                      </div>
                      <div className="absolute inset-0 pt-6 px-1 pb-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendData[classroom.id] || []} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`fill-${classroom.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis 
                              dataKey="month" 
                              hide 
                            />
                            <YAxis 
                              hide 
                              domain={[0, Math.max(classroom.capacity * 1.5, 10)]} 
                            />
                            <RechartsTooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div className="bg-background border shadow-md rounded-md p-2 text-xs">
                                      <p className="font-bold mb-1">{data.month}</p>
                                      <p className="text-primary font-medium">Enrolled: {data.enrolled}</p>
                                      <p className="text-muted-foreground">Capacity: {data.capacity}</p>
                                      {data.isForecast && <p className="text-orange-500 text-[10px] mt-1">Future projection</p>}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <ReferenceLine y={classroom.capacity} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.5} />
                            <ReferenceLine x={trendData[classroom.id]?.[12]?.month} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
                            <Area 
                              type="monotone" 
                              dataKey="enrolled" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill={`url(#fill-${classroom.id})`}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    {/* Children List (The "Bucket") */}
                    <Card className="flex-1 bg-muted/30 border-dashed border-2 shadow-none overflow-hidden flex flex-col">
                      <div className="p-3 bg-muted/50 border-b border-dashed flex justify-between items-center text-xs font-medium text-muted-foreground">
                        <span>Enrolled Roster</span>
                        {stats.graduatingNextMonth > 0 && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] px-1.5 py-0 h-5">
                            {stats.graduatingNextMonth} moving soon
                          </Badge>
                        )}
                      </div>
                      
                      <div className="p-2 flex-1 max-h-[400px] overflow-y-auto timeline-scroll space-y-2">
                        <AnimatePresence>
                          {stats.enrolled
                            .filter(child => !searchQuery || child.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((child) => {
                            const ageInMonths = getChildAgeInMonths(child.birthDate, forecastDate);
                            const monthsToGraduation = classroom.maxAgeMonths - ageInMonths;
                            const isGraduatingSoon = monthsToGraduation <= 2;
                            
                            return (
                              <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                key={child.id}
                                className={`group relative p-2 rounded-lg border bg-card flex items-center gap-3 transition-shadow hover:shadow-md
                                  ${isGraduatingSoon ? 'border-primary/40 shadow-sm' : 'border-transparent'}
                                  ${isOverCapacity ? 'opacity-80' : ''}
                                `}
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`text-[10px] ${classroom.color.split(' ')[0]} ${classroom.color.split(' ')[1]}`}>
                                    {child.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{child.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatAgeInMonths(ageInMonths)} old
                                  </p>
                                </div>
                                
                                {isGraduatingSoon && index < classrooms.length - 1 && (
                                  <div className="absolute -right-1 -top-1">
                                    <TooltipProvider>
                                      {/* Using a simple div tooltip substitute since Tooltip is complex to set up inline without all imports */}
                                      <div className="group/tt relative">
                                        <div className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                          <ChevronRight size={10} />
                                          {monthsToGraduation}m
                                        </div>
                                        <div className="absolute bottom-full right-0 mb-1 w-max bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-md border opacity-0 group-hover/tt:opacity-100 pointer-events-none transition-opacity z-50">
                                          Moves to {classrooms[index+1].name} in {monthsToGraduation} month{monthsToGraduation !== 1 ? 's' : ''}
                                        </div>
                                      </div>
                                    </TooltipProvider>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                          
                          {stats.enrolled.length === 0 && (
                            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm flex-col gap-2 opacity-50">
                              <AlertCircle size={20} />
                              <p>No children projected</p>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
