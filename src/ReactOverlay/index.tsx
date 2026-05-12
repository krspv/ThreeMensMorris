import styles from './styles.module.scss';


const ReactOverlay = () => {
  return (
    <div className={styles.topmost}>
      <button className={styles.menuButton}>Menu</button>
      <div className={styles.scoreTxt}>Three men's morris</div>
    </div>
  );
};


export default ReactOverlay;
