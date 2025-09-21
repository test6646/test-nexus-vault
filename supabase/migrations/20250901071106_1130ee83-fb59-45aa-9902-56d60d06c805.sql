-- Fix all notification template issues identified during system audit
-- 1. Fix event_update template that was using {staffName} for client notifications
-- 2. Fix task_reported template that was incorrectly addressing admin instead of staff
-- 3. Add missing event_staff_unassignment template for proper staff unassignment notifications
-- 4. Ensure all templates have proper professional tone and consistent formatting
-- 5. Add missing templates that are referenced in code but not in database

UPDATE wa_sessions 
SET notification_templates = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    notification_templates,
                    '{event_update}',
                    jsonb_build_object(
                      'title', 'EVENT UPDATED',
                      'greeting', 'Dear *{clientName}*,',
                      'content', 'Your event details have been updated:'
                    )
                  ),
                  '{task_reported}',
                  jsonb_build_object(
                    'title', 'TASK REPORTED - ISSUES FOUND',
                    'greeting', 'Dear *{staffName}*,',
                    'content', 'Your submitted task has been reported due to issues:'
                  )
                ),
                '{event_unassignment}',
                jsonb_build_object(
                  'title', 'ASSIGNMENT REMOVED',
                  'greeting', 'Dear *{staffName}*,',
                  'content', 'You have been *UNASSIGNED* from the following event:'
                )
              ),
              '{task_unassignment}',
              jsonb_build_object(
                'title', 'TASK UNASSIGNMENT',
                'greeting', 'Dear *{staffName}*,',
                'content', 'You have been *UNASSIGNED* from the following task:'
              )
            ),
            '{event_cancellation}',
            jsonb_build_object(
              'title', 'EVENT CANCELLED',
              'greeting', 'Dear *{clientName}*,',
              'content', 'We wish to inform you that the following event has been cancelled at your request:'
            )
          ),
          '{event_staff_cancellation}',
          jsonb_build_object(
            'title', 'EVENT CANCELLED',
            'greeting', 'Dear *{staffName}*,',
            'content', 'The following event has been cancelled:'
          )
        ),
        '{availability_check}',
        jsonb_build_object(
          'title', 'AVAILABILITY REQUEST',
          'greeting', 'Dear *{staffName}*,',
          'content', 'Please confirm your availability for the following dates:'
        )
      ),
      '{task_update}',
      jsonb_build_object(
        'title', 'TASK UPDATED',
        'greeting', 'Dear *{staffName}*,',
        'content', 'Your assigned task has been updated:'
      )
    ),
    '{staff_event_update}',
    jsonb_build_object(
      'title', 'EVENT DETAILS UPDATED',
      'greeting', 'Dear *{staffName}*,',
      'content', 'The event you are assigned to has been updated:'
    )
  ),
  '{general_notification}',
  jsonb_build_object(
    'title', 'NOTIFICATION',
    'greeting', 'Dear *{staffName}*,',
    'content', 'You have a notification:'
  )
)
WHERE notification_templates IS NOT NULL;