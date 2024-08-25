/**
 * Maps expressions from kobo questions to a expression format that will work on the SurveyJS.
 *
 * The numeric operators (Greater than >, Less than <, Greater than or equal to >=, Less than or equal to <=) are used the in same way in Kobo and SurveyJS.
 *
 * @param koboExpression the initial kobo logic expression
 * @param questionName name of the question to replace in the expression
 * @param choiceValue value of the choice to replace in the expression
 * @returns the mapped logic expression that will work on the SurveyJS form
 */
export const mapKoboExpression = (
  koboExpression: string,
  questionName?: string,
  choiceValue?: string
) => {
  // Replace 'name' with choiceValue in selected expressions (for choice_filter on select questions)
  if (choiceValue) {
    koboExpression = koboExpression.replace(
      /selected\(\$\{(\w+)\}, name\)/g,
      `selected(\$\{$1\}, ${choiceValue})`
    );
    // If in the Kobo form the choice has a other property, we will remove the 'or other=0' from the choice visibleIf
    koboExpression = koboExpression.replace(/or other=0/g, '');
  }
  // Replace . with {questionName}
  if (questionName) {
    // Expressions in Kobo can have ' . ' to indicate that the expression is about the question in which it is defined.
    // Example: a Validation Criteria can be ". > 5 ": the value of the question itself must be greater than 5
    koboExpression = koboExpression.replace(/\./g, `{${questionName}}`);
  }
  // Not contains
  koboExpression = koboExpression.replace(
    /not\(selected\(\$\{(\w+)\}, '(.*?)'\)\)/g,
    "{$1} notcontains '$2'"
  );
  // Replace not(...) with !(...)
  koboExpression = koboExpression.replace(/not\(/g, '!(');
  // Replace mod with %
  koboExpression = koboExpression.replace(
    /([^\/]*)\s+mod\s+([^\/]*)/g,
    (match, before, after) => {
      const transformedBefore = before.replace(/\$\{(\w+)\}/g, '{$1}');
      const transformedAfter = after.replace(/\$\{(\w+)\}/g, '{$1}');
      return `${transformedBefore} % ${transformedAfter}`;
    }
  );
  // Replace div with /
  koboExpression = koboExpression.replace(
    /([^\/]*)\s+div\s+([^\/]*)/g,
    (match, before, after) => {
      const transformedBefore = before.replace(/\$\{(\w+)\}/g, '{$1}');
      const transformedAfter = after.replace(/\$\{(\w+)\}/g, '{$1}');
      return `${transformedBefore} / ${transformedAfter}`;
    }
  );
  // Empty
  koboExpression = koboExpression.replace(/\$\{(\w+)\} = ''/g, '{$1} empty');
  // Equal to
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} = '(.*?)'/g,
    "({$1} = '$2')"
  );
  // No empty
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} != ''/g,
    '{$1} notempty'
  );
  // Not equal to
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} != '(.*?)'/g,
    "{$1} <> '$2'"
  );
  // Replace ends-with with endsWith
  koboExpression = koboExpression.replace(/ends-with\(/g, 'endsWith(');
  // Replace indexed-repeat(...) with indexedRepeat(...) and handle the first parameter to be the question/field name and not the question value
  koboExpression = koboExpression.replace(
    /indexed-repeat\(\$\{(\w+)\},\s*\$\{(\w+)\},\s*(.*?)\)/g,
    'indexedRepeat($1, {$2}, $3)'
  );
  // Replace sum(...) with sumElements(...) and handle the parameter (from question reference to question name only)
  koboExpression = koboExpression.replace(
    /sum\(\$\{(\w+)\}\)/g,
    'sumElements($1)'
  );
  // Replace max(...) with maxElements(...) and handle the parameter (from question reference to question name only)
  koboExpression = koboExpression.replace(
    /max\(\$\{(\w+)\}\)/g,
    'maxElements($1)'
  );
  // Replace min(...) with minElements(...) and handle the parameter (from question reference to question name only)
  koboExpression = koboExpression.replace(
    /min\(\$\{(\w+)\}\)/g,
    'minElements($1)'
  );
  // Replace join(' ', ${...}) with join(' ', ...) (handle the parameter, replacing the question reference for a question name only)
  koboExpression = koboExpression.replace(
    /join\(\s*'([^']*)'\s*,\s*\$\{(\w+)\}\s*\)/g,
    "join('$1', $2)"
  );
  // Replace position(..) with {panelIndex}
  koboExpression = koboExpression.replace(/position\(\.\.\)/g, '{panelIndex}');
  // Replace count-selected with length
  koboExpression = koboExpression.replace(/count-selected\(/g, 'length(');
  // Replace of format-date-time with formatDateTime
  koboExpression = koboExpression.replace(
    /format-date-time\(/g,
    'formatDateTime('
  );
  // Replace if with iif
  koboExpression = koboExpression.replace(/if\(/g, 'iif(');
  // TODO: FIX not working with expressions like if(${number1} + ${number2} > 10,45,30) + today()
  // For calculations with today() + or - days, add addDays() custom function to work on oort
  koboExpression = koboExpression.replace(
    /today\(\)\s*([\+\-])\s*(\w+)/g,
    (match, operator, term) => {
      const transformedTerm = term.replace(/\$\{(\w+)\}/g, '{$1}');
      if (operator === '+') {
        return `addDays(today(), ${transformedTerm})`;
      } else {
        return `addDays(today(), -${transformedTerm})`;
      }
    }
  );
  // Replace now() with currentDate()
  koboExpression = koboExpression.replace(/now\(\)/g, 'currentDate()');
  // Date values
  koboExpression = koboExpression.replace(/date\('(.*?)'\)/g, "'$1'");
  // Replace any remaining ${variable} to {variable}
  koboExpression = koboExpression.replace(/\$\{(\w+)\}/g, '{$1}');
  return koboExpression;
};
