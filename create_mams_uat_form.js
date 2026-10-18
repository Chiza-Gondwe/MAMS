/**
 * MAMS User Acceptance Testing Questionnaire - Google Form builder
 * ----------------------------------------------------------------
 * 1. Open your browser and go to: https://script.google.com
 * 2. Click "New project"
 * 3. Delete everything inside the editor window and paste all the code below
 * 4. Click the "Save" icon (Ctrl + S), then click "Run" (createMamsUatForm)
 * 5. When Google asks for permissions, click:
 *    - Review permissions -> Select your Google Account -> Advanced -> Go to Untitled project (unsafe) -> Allow
 * 6. Check the "Execution log" at the bottom:
 *    - Copy the link labeled: SEND THIS LINK TO TESTERS
 *    - You will also see links to edit the form and the live Google Sheet for responses!
 */

function createMamsUatForm() {
  var form = FormApp.create('MAMS User Acceptance Testing Questionnaire');
  form.setTitle('MAMS User Acceptance Testing Questionnaire');
  form.setDescription(
    'University of Zambia · CSC4004 & CSC4035\n' +
    'Membership Affiliation and Management System\n' +
    'Department of Computing and Informatics · 2026\n\n' +
    'Dear Respondent,\n\n' +
    'My name is Chiza Gondwe, a final year student in the Department of Computing and Informatics at the ' +
    'University of Zambia. Together with my project partner, Rebecca Ongani Phiri, I have developed MAMS, a ' +
    'digital Membership Affiliation and Management System for churches and school PTAs in Zambia, as part of ' +
    'my final year project supervised by Professor Jackson Phiri.\n\n' +
    'You have just used the MAMS app. This questionnaire asks how easy each step was, what problems you ' +
    'experienced, and what you think of the system. Your responses will be used solely for academic research ' +
    'purposes and will remain completely confidential. Participation is entirely voluntary.\n\n' +
    'The questionnaire should take approximately 5 minutes to complete. Thank you very much for your time.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Thank You! Your responses have been recorded successfully. They will directly contribute to the evaluation of MAMS.'
  );

  // ---------------- Consent ----------------
  form.addCheckboxItem()
    .setTitle('INFORMED CONSENT')
    .setHelpText('By completing this questionnaire, you confirm that you understand the purpose of this research, ' +
                 'that your participation is voluntary, and that your responses will remain anonymous and confidential.')
    .setChoiceValues(['I agree to take part in this questionnaire'])
    .setRequired(true);

  // ---------------- SECTION A ----------------
  form.addPageBreakItem()
    .setTitle('A. About You')
    .setHelpText('Please tick the appropriate response for each question.');
  form.addMultipleChoiceItem().setTitle('Question 1: What is your gender?')
    .setChoiceValues(['Male', 'Female', 'Prefer not to say']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 2: What is your age group?')
    .setChoiceValues(['Under 18', '18 – 25', '26 – 35', '36 – 45', '46 – 55', '56 and above']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 3: What is your role?')
    .setChoiceValues(['General church member', 'Church leader / elder', 'Church administrator / secretary',
                      'PTA parent', 'PTA official / teacher'])
    .showOtherOption(true).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 4: What did you use to test MAMS?')
    .setChoiceValues(['Android phone (MAMS app)', 'Android phone (website)', 'iPhone (website)',
                      'Laptop or computer (website)']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 5: How comfortable are you with using mobile applications?')
    .setChoiceValues(['Very comfortable', 'Comfortable', 'Neutral', 'Uncomfortable']).setRequired(true);

  // ---------------- SECTION B ----------------
  form.addPageBreakItem()
    .setTitle('B. Using the App')
    .setHelpText('How easy was each step? 1 = Very difficult · 5 = Very easy. ' +
                 'Choose "Could not do it" if you failed, or "Did not try" if you skipped the step.');
  form.addGridItem().setTitle('Question 6: Rate each step')
    .setRows([
      'Downloading or opening the app',
      'Joining the church with the church code',
      'Choosing my section and zone',
      'Receiving and entering the email verification code',
      'Logging in',
      'Viewing my profile',
      'Viewing announcements',
      'Checking in for attendance'
    ])
    .setColumns(['1', '2', '3', '4', '5', 'Could not do it', 'Did not try'])
    .setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 7: How long did it take you to register and log in?')
    .setChoiceValues(['Less than 2 minutes', '2 – 5 minutes', '5 – 10 minutes', 'More than 10 minutes',
                      'I could not finish']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 8: When did your email verification code arrive?')
    .setChoiceValues(['Within 1 minute', 'After 1 – 5 minutes', 'After more than 5 minutes',
                      'It went to my Spam folder', 'It never arrived']).setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 9: After checking in, what did you see?')
    .setChoiceValues(['"Attendance recorded"', '"Already checked in"', 'An error message', 'Nothing happened',
                      'I did not try to check in']).setRequired(true);

  // ---------------- SECTION C ----------------
  form.addPageBreakItem()
    .setTitle('C. Problems Experienced')
    .setHelpText('Tell us anything that did not work or was confusing.');
  form.addCheckboxItem().setTitle('Question 10: Did any of the following happen?')
    .setHelpText('Select all that apply')
    .setChoiceValues([
      'No problems experienced',
      'The app would not download or install',
      'I could not find where to join the church',
      'The church code was not accepted',
      'Choosing section and zone was confusing',
      'The email code did not arrive',
      'The email code expired before I used it',
      'I could not log in',
      'The check-in did not work',
      'The app or website was slow',
      'An error message appeared'
    ])
    .showOtherOption(true).setRequired(true);
  form.addCheckboxItem().setTitle('Question 11: Did you need help from someone at any step?')
    .setHelpText('Select all that apply')
    .setChoiceValues([
      'No, I did everything myself',
      'Downloading or opening the app',
      'Joining the church',
      'Choosing section and zone',
      'Email verification code',
      'Logging in',
      'Checking in'
    ]).setRequired(true);
  form.addParagraphTextItem()
    .setTitle('Question 12: If something went wrong, please describe what happened.')
    .setRequired(false);

  // ---------------- SECTION D ----------------
  form.addPageBreakItem()
    .setTitle('D. Your Opinion of MAMS')
    .setHelpText('5 = Strongly Agree · 4 = Agree · 3 = Neutral · 2 = Disagree · 1 = Strongly Disagree');
  form.addGridItem().setTitle('Question 13: How much do you agree with each statement?')
    .setRows([
      'MAMS would benefit my church or PTA.',
      'The MAMS app was easy for me to use.',
      'I felt comfortable registering my personal details in MAMS.',
      'Checking in with MAMS is faster and more accurate than a paper sign-in sheet.',
      'Announcements in MAMS would help me stay better informed.',
      'I would trust MAMS to store my membership and contribution records securely.',
      'MAMS would reduce the work of church secretaries and administrators.',
      'I would actively use MAMS if my church or PTA adopted it.'
    ])
    .setColumns(['Strongly Agree (5)', 'Agree (4)', 'Neutral (3)', 'Disagree (2)', 'Strongly Disagree (1)'])
    .setRequired(true);
  form.addMultipleChoiceItem().setTitle('Question 14: Overall, how would you rate MAMS?')
    .setChoiceValues(['Excellent', 'Good', 'Average', 'Poor', 'Very poor']).setRequired(true);

  // ---------------- SECTION E ----------------
  form.addPageBreakItem()
    .setTitle('E. Open-Ended Questions')
    .setHelpText('Please answer in your own words. There are no right or wrong answers.');
  form.addParagraphTextItem().setTitle('Question 15: What did you like most about MAMS?').setRequired(false);
  form.addParagraphTextItem().setTitle('Question 16: What would you improve or add to MAMS?').setRequired(false);
  form.addParagraphTextItem()
    .setTitle('Question 17: Do you have any concerns about using MAMS to store your personal information? If yes, please explain.')
    .setRequired(false);

  // ---------------- Responses sheet ----------------
  var sheet = SpreadsheetApp.create('MAMS UAT Questionnaire - Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('SEND THIS LINK TO TESTERS: ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Responses spreadsheet: ' + sheet.getUrl());
}
