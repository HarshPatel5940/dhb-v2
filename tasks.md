1. create mod_unban command, refer ban command.
2. create mod_warn command - Reason input compulsory.
3. create mod_cases command 
   - to check a single case info in detail using caseInfo optional input.
   - to view users cases in a paginated format using pageNo optional input.

4. Create a fields called `Guild.CurrentCounter`, `Guild.GoalCounter` where we will be creating a counter game and having an `Guild.CounterChannelId` (slowmode of 5mins). you will implement it in `handleCounterGame.ts`. once a valid number is inputed you wou react to the message with `:white_check_mark:`

5. create Purge command - to delete past x number of messages with optional input type of bot only, user only, all
