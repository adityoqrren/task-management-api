import { getDashboardStatisticsService } from "../service/dashboardService.js";

export const handleGetDashboardStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const statistics = await getDashboardStatisticsService(userId);
    return res.status(200).json({
      status: "success",
      statistics,
    });
  } catch (err) {
    next(err);
  }
};
