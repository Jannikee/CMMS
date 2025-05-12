"""
Scheduler for maintenance automation tasks
"""
import time
import threading
import schedule
import logging
from datetime import datetime, timezone
from backend.services.automation_controller import AutomationController

logger = logging.getLogger(__name__)

class MaintenanceScheduler:
    """Scheduler for maintenance automation tasks"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.use_kaplan_meier = False  # Default to Weibull analysis
    
    def start(self):
        """Start the scheduler in a background thread"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
        
        # Define schedule
        schedule.clear()
        
        # Run optimization analysis every day at 1 AM
        schedule.every().day.at("01:00").do(self._run_optimization_analysis)
        
        # Generate work orders every day at 2 AM
        schedule.every().day.at("02:00").do(self._generate_work_orders)
        
        # Validate optimization effectiveness once a week on Monday at 3 AM
        schedule.every().monday.at("03:00").do(self._validate_effectiveness)
        
        # Start the thread
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler)
        self.thread.daemon = True
        self.thread.start()
        
        logger.info("Maintenance scheduler started")
    
    def stop(self):
        """Stop the scheduler"""
        if not self.running:
            logger.warning("Scheduler is not running")
            return
        
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info("Maintenance scheduler stopped")
    
    def set_analysis_method(self, use_kaplan_meier=False):
        """Set the analysis method to use"""
        self.use_kaplan_meier = use_kaplan_meier
        logger.info(f"Analysis method set to {'Kaplan-Meier' if use_kaplan_meier else 'Weibull'}")
    
    def _run_scheduler(self):
        """Run the scheduler loop"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def _run_optimization_analysis(self):
        """Run optimization analysis task"""
        logger.info(f"Running scheduled optimization analysis using {'Kaplan-Meier' if self.use_kaplan_meier else 'Weibull'}")
        try:
            results = AutomationController.run_scheduled_optimizations(use_kaplan_meier=self.use_kaplan_meier)
            logger.info(f"Optimization analysis completed: {results['components_analyzed']} components analyzed, {results['optimizations_applied']} optimizations applied")
            return results
        except Exception as e:
            logger.error(f"Error in scheduled optimization analysis: {str(e)}")
    
    def _generate_work_orders(self):
        """Generate work orders task"""
        logger.info("Running scheduled work order generation")
        try:
            results = AutomationController.generate_updated_work_orders()
            logger.info(f"Work order generation completed: {results['work_orders_generated']} work orders generated")
            return results
        except Exception as e:
            logger.error(f"Error in scheduled work order generation: {str(e)}")
    
    def _validate_effectiveness(self):
        """Validate optimization effectiveness task"""
        logger.info("Running scheduled effectiveness validation")
        try:
            results = AutomationController.validate_optimization_effectiveness()
            logger.info(f"Effectiveness validation completed: {results['optimizations_evaluated']} optimizations evaluated, {results['effectiveness_rate']*100:.1f}% effective")
            return results
        except Exception as e:
            logger.error(f"Error in scheduled effectiveness validation: {str(e)}")

# Global scheduler instance
maintenance_scheduler = MaintenanceScheduler()