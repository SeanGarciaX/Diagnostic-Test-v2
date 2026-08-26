// The official-style directions modal, exact copy from the original app.

import styles from "./exam.module.css";

export function DirectionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <p>The questions in this section address a number of important math skills.</p>
        <p>
          Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed
          throughout the test.
        </p>
        <p>Unless otherwise indicated:</p>
        <ul>
          <li>All variables and expressions represent real numbers.</li>
          <li>Figures provided are drawn to scale.</li>
          <li>All figures lie in a plane.</li>
          <li>
            The domain of a given function <em>f</em> is the set of all real numbers <em>x</em> for which <em>f</em>(<em>x</em>) is a
            real number.
          </li>
        </ul>
        <p>
          For <strong>multiple-choice questions</strong>, solve each problem and choose the correct answer from the choices provided.
          Each multiple-choice question has a single correct answer.
        </p>
        <p>
          For <strong>student-produced response questions</strong>, solve each problem and enter your answer as described below.
        </p>
        <ul>
          <li>
            If you find <strong>more than one correct answer</strong>, enter only one answer.
          </li>
          <li>
            You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative
            sign) for a <strong>negative</strong> answer.
          </li>
          <li>
            If your answer is a <strong>fraction</strong> that doesn&apos;t fit in the provided space, enter the decimal equivalent.
          </li>
          <li>
            If your answer is a <strong>decimal</strong> that doesn&apos;t fit in the provided space, enter it by truncating or
            rounding at the fourth digit.
          </li>
          <li>
            If your answer is a <strong>mixed number</strong> (such as 3 1/2), enter it as an improper fraction (7/2) or its decimal
            equivalent (3.5).
          </li>
          <li>
            Don&apos;t enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.
          </li>
        </ul>
        <hr />
        <div style={{ textAlign: "center", fontSize: 16, color: "#1a1a2e", margin: "22px 0 16px" }}>Examples</div>
        <table>
          <thead>
            <tr>
              <th>Answer</th>
              <th>Acceptable ways to enter answer</th>
              <th>Unacceptable: will NOT receive credit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>3.5</td>
              <td>
                <code>3.5</code>
                <br />
                <code>3.50</code>
                <br />
                <code>7/2</code>
              </td>
              <td>
                <code>31/2</code>
                <br />
                <code>3 1/2</code>
              </td>
            </tr>
            <tr>
              <td>2/3</td>
              <td>
                <code>2/3</code>
                <br />
                <code>.6666</code>
                <br />
                <code>.6667</code>
                <br />
                <code>0.666</code>
                <br />
                <code>0.667</code>
              </td>
              <td>
                <code>0.66</code>
                <br />
                <code>.66</code>
                <br />
                <code>0.67</code>
                <br />
                <code>.67</code>
              </td>
            </tr>
            <tr>
              <td>&minus;1/3</td>
              <td>
                <code>-1/3</code>
                <br />
                <code>-.3333</code>
                <br />
                <code>-0.333</code>
              </td>
              <td>
                <code>-.33</code>
                <br />
                <code>-0.33</code>
              </td>
            </tr>
          </tbody>
        </table>
        <button className={styles.modalCloseBtn} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
