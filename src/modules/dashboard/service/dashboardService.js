import { countUserProjects, getDashboardTaskStats } from "../repository/dashboardRepository.js";

export const getDashboardStatisticsService = async (userId) => {
  const [projectsCount, taskStats] = await Promise.all([
    countUserProjects(userId),
    getDashboardTaskStats(userId),
  ]);

  return {
    projects: projectsCount,
    assignedTasks: taskStats.assignedTasks,
    dueSoon: taskStats.dueSoon,
    overdue: taskStats.overdue,
  };
};
