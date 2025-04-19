"""
Notification service
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.models.user import User
from backend.models.work_order import WorkOrder
from backend.models.machine import Machine
from backend.config import Config
import os
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_email(recipient_email, subject, message_html, message_text=None):
        """Send an email notification"""
        try:
            # Email configuration (should be in Config)
            smtp_server = os.environ.get('SMTP_SERVER', 'smtp.example.com')
            smtp_port = int(os.environ.get('SMTP_PORT', 587))
            smtp_username = os.environ.get('SMTP_USERNAME', 'notifications@example.com')
            smtp_password = os.environ.get('SMTP_PASSWORD', 'password')
            sender_email = os.environ.get('SENDER_EMAIL', 'cmms-notifications@example.com')
            
            # Create multipart message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = sender_email
            msg['To'] = recipient_email
            
            # Create text and HTML parts
            if message_text:
                text_part = MIMEText(message_text, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(message_html, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server and send
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.sendmail(sender_email, recipient_email, msg.as_string())
                
            return True
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            return False
    
    @staticmethod
    def notify_work_order_assignment(work_order_id):
        """Notify a user about a work order assignment"""
        work_order = WorkOrder.query.get(work_order_id)
        if not work_order or not work_order.assigned_to:
            return False
            
        user = User.query.get(work_order.assigned_to)
        if not user or not user.email:
            return False
            
        machine = Machine.query.get(work_order.machine_id)
        if not machine:
            return False
        
        subject = f"New Work Order Assignment: {work_order.title}"
        
        message_html = f"""
        <html>
        <body>
            <h2>New Work Order Assignment</h2>
            <p>You have been assigned a new work order:</p>
            <ul>
                <li><strong>Title:</strong> {work_order.title}</li>
                <li><strong>Machine:</strong> {machine.name}</li>
                <li><strong>Priority:</strong> {work_order.priority.upper()}</li>
                <li><strong>Due Date:</strong> {work_order.due_date.strftime('%Y-%m-%d')}</li>
            </ul>
            <p><strong>Description:</strong> {work_order.description}</p>
            <p>Please log in to the CMMS system to view the complete details.</p>
        </body>
        </html>
        """
        
        message_text = f"""
        New Work Order Assignment
        
        You have been assigned a new work order:
        - Title: {work_order.title}
        - Machine: {machine.name}
        - Priority: {work_order.priority.upper()}
        - Due Date: {work_order.due_date.strftime('%Y-%m-%d')}
        
        Description: {work_order.description}
        
        Please log in to the CMMS system to view the complete details.
        """
        
        return NotificationService.send_email(user.email, subject, message_html, message_text)
    
    @staticmethod
    def notify_critical_deviation(failure_id, maintenance_log_id):
        """Notify supervisors about a critical deviation"""
        from backend.models.failure import Failure
        from backend.models.maintenance_log import MaintenanceLog
        
        failure = Failure.query.get(failure_id)
        if not failure or failure.severity != 'critical':
            return False
            
        maintenance_log = MaintenanceLog.query.get(maintenance_log_id)
        if not maintenance_log:
            return False
            
        machine = Machine.query.get(maintenance_log.machine_id)
        if not machine:
            return False
        
        # Get all supervisors and admins
        supervisors = User.query.filter(User.role.in_(['supervisor', 'admin'])).all()
        if not supervisors:
            return False
            
        subject = f"CRITICAL DEVIATION ALERT: {machine.name}"
        
        message_html = f"""
        <html>
        <body>
            <h2 style="color: red;">CRITICAL DEVIATION ALERT</h2>
            <p>A critical deviation has been reported:</p>
            <ul>
                <li><strong>Machine:</strong> {machine.name}</li>
                <li><strong>Location:</strong> {machine.location}</li>
                <li><strong>Reported by:</strong> {User.query.get(maintenance_log.performed_by).username}</li>
                <li><strong>Time:</strong> {maintenance_log.timestamp.strftime('%Y-%m-%d %H:%M')}</li>
            </ul>
            <p><strong>Description:</strong> {failure.description}</p>
            <p>Please log in to the CMMS system to view the complete details and take appropriate action.</p>
        </body>
        </html>
        """
        
        message_text = f"""
        CRITICAL DEVIATION ALERT
        
        A critical deviation has been reported:
        - Machine: {machine.name}
        - Location: {machine.location}
        - Reported by: {User.query.get(maintenance_log.performed_by).username}
        - Time: {maintenance_log.timestamp.strftime('%Y-%m-%d %H:%M')}
        
        Description: {failure.description}
        
        Please log in to the CMMS system to view the complete details and take appropriate action.
        """
        
        # Send notification to all supervisors
        success = True
        for supervisor in supervisors:
            if supervisor.email:
                result = NotificationService.send_email(supervisor.email, subject, message_html, message_text)
                success = success and result
                
        return success