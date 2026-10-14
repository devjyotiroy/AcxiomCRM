const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');

const getDashboardStats = async (req, res) => {
  try {
    let customerQuery = {};
    let leadQuery = {};
    let oppQuery = {};

    if (req.user.role === 'SalesExecutive') {
      customerQuery.createdBy = req.user._id;
      leadQuery.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
      oppQuery.$or = [{ assignedTo: req.user._id }, { createdBy: req.user._id }];
    }

    const [customersCount, leads, opportunities] = await Promise.all([
      Customer.countDocuments(customerQuery),
      Lead.find(leadQuery),
      Opportunity.find(oppQuery)
    ]);

    const totalLeads = leads.length;
    const openLeads = leads.filter((l) => ['New', 'Contacted', 'Qualified'].includes(l.status)).length;

    const totalOpportunities = opportunities.length;
    const openOpportunities = opportunities.filter((o) =>
      ['Qualification', 'Proposal', 'Negotiation'].includes(o.stage)
    ).length;
    const wonOpportunities = opportunities.filter((o) => o.stage === 'Won').length;
    const lostOpportunities = opportunities.filter((o) => o.stage === 'Lost').length;

    const totalPipelineValue = opportunities
      .filter((o) => ['Qualification', 'Proposal', 'Negotiation'].includes(o.stage))
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
    const leadStatusCounts = {};
    leadStatuses.forEach((st) => {
      leadStatusCounts[st] = leads.filter((l) => l.status === st).length;
    });

    const pipelineStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    const pipelineStageCounts = {};
    const pipelineStageValues = {};
    pipelineStages.forEach((st) => {
      const stageOpps = opportunities.filter((o) => o.stage === st);
      pipelineStageCounts[st] = stageOpps.length;
      pipelineStageValues[st] = stageOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlySales = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = `${monthNames[m]} ${y}`;

      const total = opportunities
        .filter((o) => {
          if (o.stage !== 'Won') return false;
          const closeDate = new Date(o.expectedCloseDate || o.updatedAt);
          return closeDate.getMonth() === m && closeDate.getFullYear() === y;
        })
        .reduce((sum, o) => sum + (o.amount || 0), 0);

      monthlySales.push({ label, amount: total });
    }

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalCustomers: customersCount,
          totalLeads,
          openLeads,
          totalOpportunities,
          openOpportunities,
          wonOpportunities,
          lostOpportunities,
          totalPipelineValue
        },
        charts: {
          leadStatus: {
            labels: leadStatuses,
            counts: leadStatuses.map((st) => leadStatusCounts[st])
          },
          opportunityPipeline: {
            labels: pipelineStages,
            counts: pipelineStages.map((st) => pipelineStageCounts[st]),
            values: pipelineStages.map((st) => pipelineStageValues[st])
          },
          monthlySales: {
            labels: monthlySales.map((m) => m.label),
            amounts: monthlySales.map((m) => m.amount)
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats
};

